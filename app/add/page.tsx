"use client";

import { useState, useRef } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AddMemory() {
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
 const handleSearch = async () => {
  if (!query.trim()) return;

  // 🔥 MOCK DATA (temporary)
  const mockResults = [
    {
      title: "React Hooks Tutorial",
      url: "https://react.dev/learn",
    },
    {
      title: "Next.js App Router Guide",
      url: "https://nextjs.org/docs",
    },
    {
      title: "Firebase Firestore Basics",
      url: "https://firebase.google.com/docs/firestore",
    },
  ];

  const filtered = mockResults.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  setResults(filtered);
};
  const [listening, setListening] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const handleVoiceAdd = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onstart = () => setListening(true);
  recognition.onend = () => setListening(false);

  recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;

  console.log("Voice input:", transcript);

  // ✅ Only set description (no URL parsing)
  setDescription(transcript);
  descriptionRef.current?.focus();
};

  recognition.start();
};
  const router = useRouter();

const handleSubmit = async (e: any) => {
  e.preventDefault();

  if (!auth.currentUser) {
    alert("You must be logged in");
    return;
  }

  if (!description) {
    alert("Please add a description");
    return;
  }

  // Fetch preview
  let preview = null;

  if (link) {
  try {
    const res = await fetch("/api/preview", {
      method: "POST",
      body: JSON.stringify({ url: link }),
    });

    preview = await res.json();
  } catch (err) {
    console.log("Preview failed");
  }
}

  await addDoc(collection(db, "memories"), {
    link,
    description,
    userId: auth.currentUser.uid,
    createdAt: new Date(),

    // NEW DATA
    preview,
  });

  router.push("/");
};
  
  return (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="w-full max-w-md">

      {/* 🔍 SEARCH SECTION */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search for something to save..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border rounded-xl mb-2"
        />

        <button
          type="button" // ✅ IMPORTANT
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {/* 🔥 SEARCH RESULTS */}
      <div className="mb-6">
        {results.map((item, i) => (
          <div
            key={i}
            className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100"
            onClick={() => {
              setLink(item.url);
              setDescription(item.title);
              setResults([]);
            }}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-gray-500">{item.url}</p>
          </div>
        ))}
      </div>

      {/* 📝 FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md"
      >
        <h1 className="text-xl font-bold mb-4">Add Memory</h1>

        {/* 🎤 VOICE BUTTON */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleVoiceAdd}
            className="px-4 py-2 bg-black text-white rounded-xl"
          >
            {listening ? "🎙️ Listening..." : "🎤 Speak Memory"}
          </button>
        </div>

        {/* Inputs */}
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Enter link"
          className="w-full border p-2 rounded mb-3"
        />

        <input
          ref={descriptionRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full border p-2 rounded mb-4"
        />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded-lg hover:opacity-80"
        >
          Save Memory
        </button>
      </form>

    </div>
  </div>
);
}