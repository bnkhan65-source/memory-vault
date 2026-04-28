"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";
import MemoryCard from "@/components/MemoryCard";
type Memory = {
  id: string;
  text: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
  spotifyUrl?: string | null;
  type?: "vibe" | "snapshot" | "note" | "collection" | "moment" | "list";
  checked?: number[];
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [videoResults, setVideoResults] = useState<any[]>([]);
  
  const router = useRouter();

 useEffect(() => {
  let timeout = setTimeout(() => {
    console.warn("Auth timeout fallback");
    setLoading(false);
  }, 4000); // safety fallback

  const unsubscribe = onAuthStateChanged(auth, async (u) => {
    try {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
        await fetchMemories(u.uid);
      }
    } catch (err) {
      console.error("AUTH ERROR:", err);
      setError("Something went wrong");
    } finally {
      clearTimeout(timeout);
      setLoading(false); // ✅ GUARANTEED
    }
  });

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}, [router]);


  //GET MEMORY//
  const fetchMemories = async (uid: string) => {
  try {
    const q = query(
      collection(db, "users", uid, "memories"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const data: Memory[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Memory, "id">),
    }));

    setMemories(data);
  } catch (err) {
    console.error("FETCH MEMORIES ERROR:", err);
    setError("Failed to load memories");
  }
};


   // SAVE MEMORY//
  const saveMemory = async (inputValue?: string) => {
  const textToSave = inputValue ?? memory; 
  if (isSaving) return;
  if (!textToSave.trim() || !user) return;

  setIsSaving(true);

  
  setMemory(""); // clear input immediately
  
  // DO NOT use `memory` below this point

  let aiTags: string[] = [];

  try {
    const res = await fetch("/api/generate-tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: textToSave }),
    });

    const data = await res.json();
    aiTags = data.tags || [];
  } catch (err) {
    console.error("Tag error:", err);
  }

  const manualTags = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const combinedTags = [...new Set([...manualTags, ...aiTags])];

  let type: Memory["type"] = "note";

// ✅ Detect comma-separated lists
const lowerText = textToSave.toLowerCase();

if (
  textToSave.includes("\n") ||
  textToSave.split(",").length > 1 ||
  lowerText.includes("shopping list") ||
  lowerText.includes("grocery list") ||
  lowerText.includes("checklist") ||
  lowerText.includes("todo") ||
  lowerText.includes("to do")
) {
  type = "list";
}

// ✅ Music overrides everything
if (selectedTrack) {
  type = "vibe";
}
  else if (selectedTrack?.image) type = "snapshot";

  await addDoc(collection(db, "users", user.uid, "memories"), {
    text: textToSave, // ✅ use stored value
    tags: combinedTags,
    spotifyUrl: selectedTrack?.url || null,
    imageUrl: selectedTrack?.image || null,
    videoUrl:
    selectedTrack?.type === "video"
      ? `https://www.youtube.com/watch?v=${selectedTrack.videoId}`
      : null,

    type,
    checked: [], // 
    createdAt: serverTimestamp(),
  });
  setMemory("");
  setTags("");
  setSelectedTrack(null);
  setIsSaving(false);

  fetchMemories(user.uid);
};
 
  
const searchSpotify = async () => {
  if (!memory.trim()) return;

  try {
    const res = await fetch("/api/music-search", {
      method: "POST",
      headers: {
    "Content-Type": "application/json",
  },
      body: JSON.stringify({ query: memory }),
    });

    const data = await res.json();
    setSpotifyResults(data.tracks || []);
  } catch (err) {
    console.error("Spotify error:", err);
  }
};
const searchVideos = async () => {
  if (!memory.trim()) return;

  const res = await fetch("/api/video-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: memory }),
  });

  const data = await res.json();
  setVideoResults(data.videos || []);
};
const startRecording = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice not supported");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onerror = (event: any) => {
    if (event.error === "service-not-allowed") {
    alert("Voice notes work best in Safari on iPhone.");
    return;
  }
  alert(`Mic error: ${event.error}`);

};

  let transcript = "";

  recognition.onresult = (event: any) => {
    transcript = "";

    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript + " ";
    }

    transcript = transcript.trim();
    console.log("VOICE:", transcript);
  };

  recognition.onend = async () => {
    if (!transcript || !auth.currentUser) return;

    const lowerText = transcript.toLowerCase();

    let type: Memory["type"] = "note";

    if (
      lowerText.includes("shopping list") ||
      lowerText.includes("grocery list") ||
      lowerText.includes("checklist") ||
      lowerText.includes("todo") ||
      lowerText.includes("to do")
    ) {
      type = "list";
    }

    let cleanedTranscript = transcript
      .replace(/shopping list/i, "")
      .replace(/grocery list/i, "")
      .replace(/checklist/i, "")
      .replace(/todo/i, "")
      .replace(/to do/i, "")
      .replace(/done/i, "")
      .replace(/finished/i, "")
      .replace(/stop/i, "")
      .trim();

    cleanedTranscript = cleanedTranscript
      .split(" ")
      .join(", ");

    await addDoc(
      collection(db, "users", auth.currentUser.uid, "memories"),
      {
        text: cleanedTranscript,
        type,
        checked: [],
        createdAt: serverTimestamp(),
      }
    );

    fetchMemories(auth.currentUser.uid);
  };

  recognition.start();
};

const deleteMemory = async (id: string) => {
  if (!auth.currentUser) return;

  await deleteDoc(
    doc(db, "users", auth.currentUser.uid, "memories", id)
  );

  fetchMemories(auth.currentUser.uid);
};
const toggleCheck = async (
  memoryId: string,
  index: number,
  currentChecked: number[] = []
) => {
  if (!auth.currentUser) return;

  const updatedChecked = currentChecked.includes(index)
    ? currentChecked.filter((i) => i !== index)
    : [...currentChecked, index];

  await updateDoc(
    doc(
      db,
      "users",
      auth.currentUser.uid,
      "memories",
      memoryId
    ),
    {
      checked: updatedChecked,
    }
  );

  fetchMemories(auth.currentUser.uid);
};
          //CONTENT CARD 
 const filteredMemories = memories.filter((m) => {
 const textMatch = [
  m.text || "",
    ...(m.tags || []),
]
  .join(" ")
  .toLowerCase()
  .includes(search.toLowerCase());

  const tagMatch = activeTag
    ? m.tags?.includes(activeTag)
    : true;

  return textMatch && tagMatch;
});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
       <p className="text-gray-500">Loading...</p>
  </div>
  );
}
     
 return (
  <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 px-3 py-4 flex flex-col">
    
 
    
    <div className="flex-1 max-w-xl mx-auto w-full backdrop-blur-md bg-white/60 p-4 rounded-2xl shadow-xl border border-white/40">
      
      {/* Header */}
      <h1 className="text-3xl font-semibold mb-1 tracking-wide text-gray-700 drop-shadow-sm">
        Memory Vault
      </h1>
      <p className="text-sm text-gray-500 mb-4 italic">
        {user?.email}
      </p>
    

      {/* Input */}
   <div className="mb-4 space-y-2">
  {/* Input row */}
  <div className="flex items-center gap-2">
   <input
  
  value={memory}
  onChange={(e) => setMemory(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); //  THIS is the key
      const value = (e.target as HTMLInputElement).value;
    saveMemory(value); // ✅ pass directly
    }
  }}
  placeholder='Add memory…”'
  className="flex-1 min-w-0 bg-white/60 backdrop-blur-md border border-white/40 p-3 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none"
  />
  

    <button
  onClick={startRecording}
  className="p-3 bg-white/60 rounded-lg"
>
  🎤
</button>

<button
  type="button"
  onClick={() =>
    alert('Say "shopping list" to create checklist memories')
  }
  className="p-3 bg-white/60 rounded-lg text-gray-500"
>
  ⓘ
</button>
  </div>
{selectedTrack?.type === "video" && (
  <div className="bg-white p-3 rounded-xl shadow-sm mb-3 border">
    
    <div className="flex items-center gap-3">
      <img
        src={selectedTrack.thumbnail}
        className="w-12 h-12 rounded"
      />

      <div className="flex-1">
        <p className="text-sm font-medium">
          {selectedTrack.title}
        </p>
        <p className="text-xs text-gray-400">Video selected</p>
      </div>

      {/* ❌ Remove */}
      <button
        onClick={() => setSelectedTrack(null)}
        className="text-xs text-red-500"
      >
        Remove
      </button>
    </div>

    {/* Optional: embedded preview */}
    <iframe
      src={`https://www.youtube.com/embed/${selectedTrack.videoId}`}
      className="w-full h-40 rounded mt-2"
      allowFullScreen
    />
  </div>
)}
  


</div>  {/* ✅ CLOSE INPUT ROW HERE */}

<div className="flex gap-2 mt-2 mb-4">
  {/* 🎵 Find Music */}
  <button
    onClick={searchSpotify}
    className="flex-1 text-sm text-green-600 bg-white/60 rounded-lg px-3 py-2"
  >
    🎵 Find Music
  </button>
<button
  onClick={searchVideos}
  className="text-sm text-blue-600 bg-white/60 rounded-lg px-3 py-2"
>
  🎥 Find Video
</button>
  {/* ✅ Save */}
  <button
    onClick={() => saveMemory()}
    disabled={!memory.trim() || isSaving}
    className={`px-4 py-2 rounded-lg font-medium shadow-md transition
      ${
        !memory.trim() || isSaving
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:brightness-110 active:brightness-95 active:shadow-inner"
      }
    `}
  >
    {isSaving ? "Saving..." : "Save Memory"}
  </button>
</div>
{(spotifyResults.length > 0 || videoResults.length > 0) && (
  <div className="flex justify-end mb-2">
    <button
      onClick={() => {
        setSpotifyResults([]);
        setVideoResults([]);
      }}
      className="text-xs px-2 py-1 bg-white/60 rounded-lg border text-gray-500 hover:bg-gray-100"
    >
      Clear results ✕
    </button>
  </div>
)}

{/* 🎵 Results */}
{spotifyResults.length > 0 && (
  <div className="mt-3 space-y-2">
    {spotifyResults.map((track, i) => (
      <div
        key={i}
        onClick={() => {
          setSelectedTrack(track);
          setMemory(`${track.title} — ${track.artist}`);
          setSpotifyResults([]);
        }}
        className="bg-white p-4 rounded-xl border flex items-center gap-4 cursor-pointer hover:bg-gray-50"
      >
        {track.image && (
          <img src={track.image} className="w-12 h-12 rounded" />
        )}

        <div className="flex-1">
          <p className="text-sm font-medium">{track.title}</p>
          <p className="text-xs text-gray-500">{track.artist}</p>
        </div>
      </div>
    ))}
  </div>
)}
{videoResults.length > 0 && (
  <div className="mt-3 space-y-2">
    {videoResults.map((video, i) => (
      <div
        key={i}
        onClick={() => {
          setMemory(video.title);

          setSelectedTrack({
            type: "video",
            videoId: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
          });

          setVideoResults([]);
        }}
        className="bg-white p-3 rounded-lg border flex items-center gap-3 cursor-pointer hover:bg-gray-50"
      >
        <img src={video.thumbnail} className="w-12 h-12 rounded" />
        <p className="text-sm">{video.title}</p>
      </div>
    ))}
  </div>
)}

{/* 🔍 Search */}
<input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search memories..."
  className="bg-white/60 backdrop-blur-md border border-white/40 p-3 w-full rounded-lg text-base mb-2 focus:outline-none"
/>

{search && (
  <p className="text-sm text-gray-500 mb-2">
    {filteredMemories.length} result(s)
  </p>
)}

{/* ✅ Step 2: Clear search */}
<div className="flex gap-3 mb-4">
  {search && (
    <button
      onClick={() => setSearch("")}
      className="text-sm text-gray-400 hover:text-gray-600 transition"
    >
      Clear search
    </button>
  )}

  {activeTag && (
    <button
      onClick={() => setActiveTag(null)}
      className="text-sm text-purple-500"
    >
      Clear tag: #{activeTag}
    </button>
  )}

</div>

    {/* Memory Card */}
<div className="space-y-4">

  {filteredMemories.length === 0 ? (
  <p className="text-center text-gray-400 mt-6">
    No memories yet — start capturing your story ✨
  </p>
) : (
filteredMemories.map((m) => (
  <MemoryCard
    key={m.id}
    memory={m}
    onDelete={deleteMemory}
    onToggleCheck={toggleCheck}
  />
))
)}

</div>

</div> {/* inner */}

<BottomNav />

</div> 

);

}