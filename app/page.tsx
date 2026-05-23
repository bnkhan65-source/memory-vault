"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
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
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import MemoryCard from "@/components/MemoryCard";
import SortableMemoryCard from "@/components/SortableMemoryCard";
import OnboardingModal from "@/components/OnboardingModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

// ── Types ─────────────────────────────────────────────────────────────────────

type SelectedItem = {
  kind: "movie" | "music" | "video";
  title: string;
  image?: string | null;
  year?: string;
  artist?: string;
  url?: string;
  videoId?: string;
  movieId?: number;
};

type Memory = {
  id: string;
  text?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
  spotifyUrl?: string | null;
  type?: "vibe" | "snapshot" | "note" | "collection" | "moment" | "list" | "playlist" | "link";
  playlistType?: "music" | "movie" | "video" | "mixed";
  checked?: number[];
  items?: SelectedItem[];
  listItems?: string[];
  pinned?: boolean;
};

type Track = {
  title?: string;
  artist?: string;
  image?: string;
  url?: string;
  type?: "video";
  videoId?: string;
  thumbnail?: string;
};

type Movie = {
  id: number;
  title: string;
  year: string;
  poster: string | null;
  mediaType?: "movie" | "tv";
};

type ResultBatch<T> = { query: string; items: T[]; time: number };

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [musicBatches, setMusicBatches] = useState<ResultBatch<Track>[]>([]);
  const [videoBatches, setVideoBatches] = useState<ResultBatch<Track>[]>([]);
  const [movieBatches, setMovieBatches] = useState<ResultBatch<Movie>[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [editingVoiceQuery, setEditingVoiceQuery] = useState(false);
  const [mediaRecorderInstance, setMediaRecorderInstance] =
    useState<MediaRecorder | null>(null);
  const [showBag, setShowBag] = useState(false);
  const [bagBump, setBagBump] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showAddToListSheet, setShowAddToListSheet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "type" | "custom">("newest");
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [collapseAll, setCollapseAll] = useState<boolean | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );
  const [filterType, setFilterType] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState("");
  const [newListItemInput, setNewListItemInput] = useState("");
  const memoryInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // ── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn("Auth timeout fallback");
      setLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          router.push("/login");
        } else if (!u.emailVerified && u.providerData[0]?.providerId === "password") {
          router.push("/verify");
        } else {
          setUser(u);
          await Promise.all([fetchMemories(u.uid), loadUserProfile(u.uid)]);
          if (!localStorage.getItem("stash_onboarded")) {
            setShowOnboarding(true);
          }
        }
      } catch (err) {
        console.error("AUTH ERROR:", err);
        setError("Something went wrong loading your account.");
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [router]);

  // ── User profile ────────────────────────────────────────────────────────────

  const loadUserProfile = async (uid: string) => {
    const profileRef = doc(db, "users", uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await setDoc(profileRef, { createdAt: new Date().toISOString() });
    } else {
      const data = snap.data();
      if (data?.cardOrder) setCardOrder(data.cardOrder);
    }
  };

  // ── Fetch memories ──────────────────────────────────────────────────────────

  const fetchMemories = async (uid: string) => {
    try {
      const q = query(
        collection(db, "users", uid, "memories"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data: Memory[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Memory, "id">),
      }));
      setMemories(data);
    } catch (err) {
      console.error("FETCH MEMORIES ERROR:", err);
      setError("Failed to load memories.");
    }
  };

  // ── Detect memory type ──────────────────────────────────────────────────────

  const detectType = (text: string, track: Track | null): Memory["type"] => {
    const lower = text.toLowerCase();
    let type: Memory["type"] = "note";

    if (
      text.includes("\n") ||
      text.split(",").length > 1 ||
      lower.includes("shopping list") ||
      lower.includes("grocery list") ||
      lower.includes("checklist") ||
      lower.includes("todo") ||
      lower.includes("to do")
    ) {
      type = "list";
    }

    if (track?.image && !track?.url) {
      type = "snapshot";
    }

    if (track?.url) {
      type = "vibe";
    }

    return type;
  };

  // ── Save memory ─────────────────────────────────────────────────────────────

  const MAX_MEMORIES = 200;

  const saveMemory = async (inputValue?: string) => {
    const textToSave = inputValue ?? memory;
    if (isSaving) return;
    if (!textToSave.trim() || !user) return;

    // Per-user memory cap
    if (memories.length >= MAX_MEMORIES) {
      setError(`You've reached the maximum of ${MAX_MEMORIES} saved memories. Please delete some before adding more.`);
      return;
    }

    setIsSaving(true);
    setMemory("");

    let aiTags: string[] = [];

    try {
      const res = await fetch("/api/generate-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSave }),
      });
      const data = await res.json();
      aiTags = data.tags || [];
    } catch (err) {
      console.error("Tag generation error:", err);
    }

    const combinedTags = [...new Set([...aiTags])];
    const type = detectType(textToSave, selectedTrack);

    try {
      const newDoc = await addDoc(
        collection(db, "users", user.uid, "memories"),
        {
          text: textToSave,
          tags: combinedTags,
          spotifyUrl: selectedTrack?.url || null,
          imageUrl: selectedTrack?.image || null,
          videoUrl:
            selectedTrack?.type === "video"
              ? `https://www.youtube.com/watch?v=${selectedTrack.videoId}`
              : null,
          type,
          checked: [],
          createdAt: serverTimestamp(),
        }
      );

      const newMemory: Memory = {
        id: newDoc.id,
        text: textToSave,
        tags: combinedTags,
        spotifyUrl: selectedTrack?.url || null,
        imageUrl: selectedTrack?.image || null,
        videoUrl:
          selectedTrack?.type === "video"
            ? `https://www.youtube.com/watch?v=${selectedTrack.videoId}`
            : null,
        type,
        checked: [],
      };

      setMemories((prev) => [newMemory, ...prev]);
      setSelectedTrack(null);
    } catch (err) {
      console.error("SAVE ERROR:", err);
      setError("Failed to save memory. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save a pasted URL as a link memory ────────────────────────────────────
  const saveLinkMemory = async (url: string) => {
    if (!user) return;
    if (memories.length >= MAX_MEMORIES) {
      setError(`You've reached the maximum of ${MAX_MEMORIES} saved memories.`);
      return;
    }
    setIsSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      let title: string | null = null;
      try {
        const res = await fetch("/api/fetch-title", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        title = data.title || null;
      } catch { /* title stays null */ }

      const text = title || url;
      const newDoc = await addDoc(collection(db, "users", user.uid, "memories"), {
        text,
        videoUrl: url,
        type: "link",
        tags: [],
        checked: [],
        createdAt: serverTimestamp(),
      });
      setMemories((prev) => [{ id: newDoc.id, text, videoUrl: url, type: "link", checked: [] }, ...prev]);
      setMemory("");
    } catch (err) {
      console.error("SAVE LINK ERROR:", err);
      setError("Failed to save link. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Search music ────────────────────────────────────────────────────────────

  const searchSpotify = async (q?: string) => {
    const term = String(q || memory || voiceQuery || "");
    if (!term.trim()) return;
    try {
      const res = await fetch("/api/music-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
      });
      const data = await res.json();
      const items: Track[] = data.tracks || [];
      setMusicBatches((prev) => {
        const idx = prev.findIndex((b) => b.query === term);
        if (idx >= 0) { const u = [...prev]; u[idx] = { query: term, items, time: Date.now() }; return u; }
        return [...prev, { query: term, items, time: Date.now() }];
      });
    } catch (err) {
      console.error("Music search error:", err);
    }
  };

  // ── Search videos ───────────────────────────────────────────────────────────

  const searchVideos = async (q?: string) => {
    const term = String(q || memory || voiceQuery || "");
    if (!term.trim()) return;
    try {
      const res = await fetch("/api/video-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
      });
      const data = await res.json();
      const items: Track[] = data.videos || [];
      setVideoBatches((prev) => {
        const idx = prev.findIndex((b) => b.query === term);
        if (idx >= 0) { const u = [...prev]; u[idx] = { query: term, items, time: Date.now() }; return u; }
        return [...prev, { query: term, items, time: Date.now() }];
      });
    } catch (err) {
      console.error("Video search error:", err);
    }
  };

  // ── Search movies ───────────────────────────────────────────────────────────

  const searchMovies = async (q?: string) => {
    const term = String(q ?? memory ?? voiceQuery ?? "");
    if (!term.trim()) return;
    try {
      const res = await fetch("/api/movie-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term }),
      });
      const data = await res.json();
      const items: Movie[] = data.movies || [];
      setMovieBatches((prev) => {
        const idx = prev.findIndex((b) => b.query === term);
        if (idx >= 0) { const u = [...prev]; u[idx] = { query: term, items, time: Date.now() }; return u; }
        return [...prev, { query: term, items, time: Date.now() }];
      });
    } catch (err) {
      console.error("[searchMovies] fetch error:", err);
    }
  };

  // ── Multi-select helpers ────────────────────────────────────────────────────

  const addToSelection = (item: SelectedItem) => {
    setSelectedItems((prev) => {
      if (prev.length >= 10) return prev;
      if (prev.some((s) => s.title === item.title && s.kind === item.kind && s.artist === item.artist && s.year === item.year)) return prev;
      return [...prev, item];
    });
    setBagBump(true);
    setTimeout(() => setBagBump(false), 450);
  };

  const removeFromSelection = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSearchState = () => {
    setMemory("");
    setVoiceQuery("");
    setEditingVoiceQuery(false);
    setMusicBatches([]);
    setVideoBatches([]);
    setMovieBatches([]);
    setSelectedItems([]);
  };

  const getPlaylistType = (): "music" | "movie" | "video" | "mixed" => {
    const kinds = [...new Set(selectedItems.map((i) => i.kind))];
    if (kinds.length === 1) return kinds[0] as "music" | "movie" | "video";
    return "mixed";
  };

  const saveAsPlaylist = async () => {
    if (!user || selectedItems.length === 0) return;
    const playlistType = getPlaylistType();
    const label = playlistType === "music" ? "🎵" : playlistType === "movie" ? "🎬" : playlistType === "video" ? "🎥" : "🎶";
    try {
      const newDoc = await addDoc(collection(db, "users", user.uid, "memories"), {
        text: `${label} Playlist (${selectedItems.length} items)`,
        type: "playlist",
        playlistType,
        items: selectedItems,
        checked: [],
        createdAt: serverTimestamp(),
      });
      setMemories((prev) => [
        { id: newDoc.id, text: `${label} Playlist (${selectedItems.length} items)`, type: "playlist", playlistType, items: selectedItems, checked: [] },
        ...prev,
      ]);
      clearSearchState();
    } catch (err) {
      console.error("SAVE PLAYLIST ERROR:", err);
      setError("Failed to save playlist.");
    }
  };

  const addToExistingPlaylist = async (playlistId: string) => {
    if (!user || selectedItems.length === 0) return;
    const playlist = memories.find((m) => m.id === playlistId);
    if (!playlist) return;
    const newItems = [...(playlist.items || []), ...selectedItems];
    const newText = playlist.text?.replace(/\(\d+ items?\)/, `(${newItems.length} items)`) ?? `Playlist (${newItems.length} items)`;
    try {
      await updateDoc(doc(db, "users", user.uid, "memories", playlistId), {
        items: newItems,
        text: newText,
      });
      setMemories((prev) =>
        prev.map((m) => m.id === playlistId ? { ...m, items: newItems, text: newText } : m)
      );
      clearSearchState();
    } catch (err) {
      console.error("ADD TO PLAYLIST ERROR:", err);
      setError("Failed to update playlist.");
    }
  };

  const saveSeparately = async () => {
    if (!user || selectedItems.length === 0) return;
    if (memories.length + selectedItems.length > MAX_MEMORIES) {
      setError(`Saving these items would exceed the ${MAX_MEMORIES} memory limit. Please delete some first.`);
      return;
    }
    const newMemories: Memory[] = [];
    let skipped = 0;
    for (const item of selectedItems) {
      try {
        const text = item.kind === "music"
          ? `${item.title}${item.artist ? ` — ${item.artist}` : ""}`
          : `${item.title}${item.year ? ` (${item.year})` : ""}`;

        // Skip if already saved (same title text, case-insensitive)
        const alreadySaved = memories.some(
          m => m.text?.toLowerCase().trim() === text.toLowerCase().trim()
        );
        if (alreadySaved) { skipped++; continue; }

        const type = item.kind === "video" ? "vibe" : item.url ? "vibe" : "snapshot";
        const videoUrl = item.kind === "video" && item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : null;
        const newDoc = await addDoc(collection(db, "users", user.uid, "memories"), {
          text, type, imageUrl: item.image || null, spotifyUrl: item.url || null, videoUrl, checked: [], createdAt: serverTimestamp(),
        });
        newMemories.push({ id: newDoc.id, text, type, imageUrl: item.image || null, spotifyUrl: item.url || null, videoUrl, checked: [] });
      } catch (err) {
        console.error("SAVE SEPARATE ERROR:", err);
      }
    }
    if (skipped > 0) {
      setError(`${skipped} item${skipped > 1 ? "s were" : " was"} already in your Stash and skipped.`);
    }
    setMemories((prev) => [...newMemories, ...prev]);
    clearSearchState();
  };

  // ── Create list ─────────────────────────────────────────────────────────────

  const createList = async () => {
    if (!user || !listTitle.trim()) return;
    const parsedItems = newListItemInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const newDoc = await addDoc(collection(db, "users", user.uid, "memories"), {
        text: listTitle.trim(),
        type: "list",
        listItems: parsedItems,
        checked: [],
        createdAt: serverTimestamp(),
      });
      setMemories((prev) => [
        { id: newDoc.id, text: listTitle.trim(), type: "list", listItems: parsedItems, checked: [] },
        ...prev,
      ]);
      setShowListModal(false);
      setListTitle("");
      setNewListItemInput("");
    } catch (err) {
      console.error("CREATE LIST ERROR:", err);
      setError("Failed to create list.");
    }
  };

  const removeListItems = async (memoryId: string, indicesToRemove: number[]) => {
    if (!user) return;
    const listMemory = memories.find((m) => m.id === memoryId);
    if (!listMemory) return;
    const currentItems = listMemory.listItems || [];
    const updatedItems = currentItems.filter((_, i) => !indicesToRemove.includes(i));
    try {
      await updateDoc(doc(db, "users", user.uid, "memories", memoryId), {
        listItems: updatedItems,
        checked: [],
      });
      setMemories((prev) =>
        prev.map((m) => m.id === memoryId ? { ...m, listItems: updatedItems, checked: [] } : m)
      );
    } catch (err) {
      console.error("REMOVE LIST ITEMS ERROR:", err);
      setError("Failed to remove items.");
    }
  };

  const togglePin = async (memoryId: string, currentlyPinned: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "memories", memoryId), {
        pinned: !currentlyPinned,
      });
      setMemories((prev) =>
        prev.map((m) => m.id === memoryId ? { ...m, pinned: !currentlyPinned } : m)
      );
    } catch (err) {
      console.error("PIN ERROR:", err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = cardOrder.length > 0 ? cardOrder : memories.map((m) => m.id);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    setCardOrder(newOrder);

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { cardOrder: newOrder });
      } catch (err) {
        console.error("SAVE ORDER ERROR:", err);
      }
    }
  };

  const addItemToList = async (memoryId: string, item: string) => {
    if (!user || !item.trim()) return;
    const listMemory = memories.find((m) => m.id === memoryId);
    if (!listMemory) return;
    const currentItems =
      listMemory.listItems && listMemory.listItems.length > 0
        ? listMemory.listItems
        : (listMemory.text || "").split(",").map((s) => s.trim()).filter(Boolean);
    const updatedItems = [...currentItems, item.trim()];
    try {
      await updateDoc(doc(db, "users", user.uid, "memories", memoryId), {
        listItems: updatedItems,
      });
      setMemories((prev) =>
        prev.map((m) => m.id === memoryId ? { ...m, listItems: updatedItems } : m)
      );
    } catch (err) {
      console.error("ADD LIST ITEM ERROR:", err);
      setError("Failed to add item to list.");
    }
  };

  // ── Typed search (same flow as voice, minus transcription) ─────────────────

  const handleTypedSearch = async () => {
    const text = memory.trim();
    if (!text) return;

    setMemory("");
    setIsDetecting(true);

    let detectedQuery = text;
    let intent: "music" | "movie" | "video" | "all" = "all";

    try {
      const intentRes = await fetch("/api/detect-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const intentData = await intentRes.json();
      detectedQuery = intentData.query || text;
      intent = intentData.intent || "all";
    } catch {
      console.warn("Intent detection failed, defaulting to 'all'");
    }

    setVoiceQuery(detectedQuery);
    setIsDetecting(false);

    if (intent === "music") {
      await searchSpotify(detectedQuery);
    } else if (intent === "movie") {
      await searchMovies(detectedQuery);
    } else if (intent === "video") {
      await searchVideos(detectedQuery);
    } else {
      await Promise.all([
        searchSpotify(detectedQuery),
        searchMovies(detectedQuery),
        searchVideos(detectedQuery),
      ]);
    }
  };

  // ── Voice recording (Whisper) ───────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      // Helper to fully release the mic
      const releaseMic = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      };

      setIsListening(true);

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        releaseMic();

        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Silence detection: a recording with no speech is just container headers
        // (~a few hundred bytes). Real speech is always several KB.
        // This works reliably across iOS Safari, Android Chrome, and desktop.
        if (audioBlob.size < 1500) {
          setError("No sound detected — please speak closer to your microphone and try again.");
          setIsListening(false);
          setIsDetecting(false);
          return;
        }
        const ext = mimeType === "audio/mp4" ? "m4a" : "webm";
        const formData = new FormData();
        formData.append("file", audioBlob, `recording.${ext}`);

        try {
          // Step 1: Transcribe audio (send Firebase token to verify identity)
          const idToken = await user?.getIdToken();
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
            body: formData,
          });
          const data = await res.json();
          if (!data.text) {
            setError(data.error || "Could not hear anything — please try again.");
            return;
          }

          const spokenText = data.text.trim();

          // Step 2: Detect intent + get clean query
          setIsDetecting(true);
          let query = spokenText;
          let intent: "music" | "movie" | "video" | "all" = "all";

          try {
            const intentRes = await fetch("/api/detect-intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: spokenText }),
            });
            const intentData = await intentRes.json();
            query = intentData.query || spokenText;
            intent = intentData.intent || "all";
          } catch {
            console.warn("Intent detection failed, defaulting to 'all'");
          }

          // Step 3: Show detected query as a label (not in the input — avoids iOS keyboard)
          setVoiceQuery(query);
          setIsDetecting(false);

          // Step 4: Auto-search the right category
          if (intent === "music") {
            await searchSpotify(query);
          } else if (intent === "movie") {
            await searchMovies(query);
          } else if (intent === "video") {
            await searchVideos(query);
          } else {
            // "all" — search everything in parallel
            // But don't overwrite a category if the user already has selections from it
            const hasMusic = selectedItems.some(i => i.kind === "music");
            const hasMovie = selectedItems.some(i => i.kind === "movie");
            const hasVideo = selectedItems.some(i => i.kind === "video");
            await Promise.all([
              hasMusic ? Promise.resolve() : searchSpotify(query),
              hasMovie ? Promise.resolve() : searchMovies(query),
              hasVideo ? Promise.resolve() : searchVideos(query),
            ]);
          }
        } catch (err) {
          console.error("VOICE SEARCH ERROR:", err);
          setIsDetecting(false);
          setError("Voice search failed. Please try again.");
        }
      };

      mediaRecorder.start();

      // Auto-stop after 8 seconds
      const autoStop = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 8000);

      // Safety fallback — force-release mic after 30 seconds no matter what
      const safetyStop = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
        releaseMic();
      }, 30000);

      mediaRecorder.addEventListener("stop", () => {
        clearTimeout(autoStop);
        clearTimeout(safetyStop);
      }, { once: true });

      setMediaRecorderInstance(mediaRecorder);
    } catch (err) {
      console.error("MIC ERROR:", err);
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("Microphone access denied.\n\niPhone fix:\n1. Tap the page icon (monitor) in the Safari address bar\n2. Tap the three dots (...)\n3. Under Website Settings, tap Microphone\n4. Set to Allow\n\nThen try again.");
      } else {
        alert("Microphone access denied. Please allow microphone access in your browser settings and try again.");
      }
    }
  };

  // ── Delete memory ───────────────────────────────────────────────────────────

  const deleteMemory = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(
        doc(db, "users", auth.currentUser.uid, "memories", id)
      );
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("DELETE ERROR:", err);
      setError("Failed to delete memory.");
    }
  };

  // ── Toggle checklist item ───────────────────────────────────────────────────

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
      doc(db, "users", auth.currentUser.uid, "memories", memoryId),
      { checked: updatedChecked }
    );

    setMemories((prev) =>
      prev.map((m) =>
        m.id === memoryId ? { ...m, checked: updatedChecked } : m
      )
    );
  };

  // ── Filtered + sorted memories ──────────────────────────────────────────────

  const filteredMemories = (() => {
    let result = memories.filter((m) => {
      const textMatch = [m.text || "", ...(m.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const tagMatch = activeTag ? m.tags?.includes(activeTag) : true;
      const typeMatch = filterType
        ? filterType === "pic"
          ? (m.type === "snapshot" || m.type === "moment" || (!m.type && !!m.imageUrl))
          : m.type === filterType
        : true;
      return textMatch && tagMatch && typeMatch;
    });

    const pinned = result.filter((m) => m.pinned);
    const unpinned = result.filter((m) => !m.pinned);

    const byCustomOrder = (arr: Memory[]) => {
      if (cardOrder.length === 0) return arr;
      return [...arr].sort((a, b) => {
        const ai = cardOrder.indexOf(a.id);
        const bi = cardOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    };

    if (sortBy === "custom") return [...byCustomOrder(pinned), ...byCustomOrder(unpinned)];
    if (sortBy === "oldest") return [...pinned, ...[...unpinned].reverse()];
    if (sortBy === "az") return [...pinned, ...[...unpinned].sort((a, b) => (a.text || "").toLowerCase().localeCompare((b.text || "").toLowerCase()))];
    if (sortBy === "type") return [...pinned, ...[...unpinned].sort((a, b) => (a.type || "").localeCompare(b.type || ""))];
    return [...pinned, ...unpinned]; // "newest"
  })();

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-stone-950 px-3 py-4 flex flex-col overflow-y-auto" style={{ position: "fixed", inset: 0 }}>
      <div className="flex-1 max-w-xl mx-auto w-full bg-stone-900 p-4 rounded-2xl shadow-xl border border-stone-700">

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎞️</span>
            <h1 className="text-2xl font-semibold tracking-wide text-stone-100">Stash</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-stone-500 border border-stone-700 rounded-lg p-1.5 hover:border-stone-500 hover:text-stone-300 active:bg-stone-700 active:text-stone-200 active:border-stone-500 active:scale-90 transition-all"
              title="How to use Stash"
            >
              ?
            </button>
            <button
              onClick={() => { setFeedbackSent(false); setFeedbackText(""); setShowFeedbackModal(true); }}
              className="text-stone-500 border border-stone-700 rounded-lg p-1.5 hover:border-stone-500 hover:text-stone-300 active:bg-stone-700 active:text-stone-200 active:border-stone-500 active:scale-90 transition-all"
              title="Send feedback"
            >
              💬
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-stone-500 border border-stone-700 rounded-lg px-2.5 py-1.5 hover:border-stone-500 hover:text-stone-300 active:bg-stone-700 active:text-stone-200 active:scale-90 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600 font-medium"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-4 space-y-2">
          <input
            ref={memoryInputRef}
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTypedSearch();
              }
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              if (/^https?:\/\//i.test(pasted)) {
                e.preventDefault();
                saveLinkMemory(pasted);
              }
            }}
            placeholder="Type or speak what you're looking for…"
            className="w-full bg-stone-800 border border-stone-600 p-3 rounded-xl text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
          />

          {/* Action buttons row */}
          <div className="flex justify-around">
            <button
              type="button"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                if (isListening && mediaRecorderInstance) {
                  mediaRecorderInstance.stop();
                } else {
                  startRecording();
                }
              }}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700 ${
                isListening ? "opacity-100" : "opacity-100"
              }`}
              title={isListening ? "Stop recording" : "Speak a memory"}
            >
              <span className="text-2xl">{isListening ? "⏹️" : "🎤"}</span>
              <span className={`text-[10px] ${isListening ? "text-red-400" : "text-stone-500"}`}>
                {isListening ? "Stop" : "Speak"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/camera")}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
              title="Add a photo memory"
            >
              <span className="text-2xl">📷</span>
              <span className="text-[10px] text-stone-500">Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowListModal(true)}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
              title="Create a new list"
            >
              <span className="text-2xl">📝</span>
              <span className="text-[10px] text-stone-500">List</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/guide")}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
              title="User Guide"
            >
              <span className="text-2xl">❓</span>
              <span className="text-[10px] text-stone-500">Help</span>
            </button>
          </div>

        </div>

          {isDetecting && (
            <p className="text-xs text-amber-400 animate-pulse px-1 mb-2">
              ✨ Identifying what you&apos;re looking for…
            </p>
          )}

          {selectedTrack?.type === "video" && (
            <div className="bg-white p-3 rounded-xl shadow-sm border">
              <div className="flex items-center gap-3">
                <img
                  src={selectedTrack.thumbnail}
                  className="w-12 h-12 rounded"
                  alt={selectedTrack.title}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedTrack.title}</p>
                  <p className="text-xs text-gray-400">Video selected</p>
                </div>
                <button
                  onClick={() => setSelectedTrack(null)}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${selectedTrack.videoId}`}
                className="w-full h-40 rounded mt-2"
                allowFullScreen
              />
            </div>
          )}

        <div className="flex justify-around mt-1 mb-4">
          <button
            onClick={() => searchSpotify()}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
          >
            <span className="text-2xl">🎵</span>
            <span className="text-[10px] text-amber-400">Find Music</span>
          </button>
          <button
            onClick={() => searchVideos()}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
          >
            <span className="text-2xl">🎥</span>
            <span className="text-[10px] text-blue-400">Find Video</span>
          </button>
          <button
            onClick={() => searchMovies()}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700"
          >
            <span className="text-2xl">🎬</span>
            <span className="text-[10px] text-red-400">Find Movie</span>
          </button>
          <button
            onClick={() => saveMemory()}
            disabled={!memory.trim() || isSaving}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all active:scale-90 active:bg-stone-700 ${
              !memory.trim() || isSaving ? "opacity-30" : "opacity-100"
            }`}
          >
            <span className="text-2xl">💾</span>
            <span className="text-[10px] text-amber-400">{isSaving ? "Saving…" : "Save note"}</span>
          </button>
        </div>

        {(voiceQuery || memory.trim() || musicBatches.length > 0 || videoBatches.length > 0 || movieBatches.length > 0) && (
          <div className="flex flex-col gap-1.5 mb-2">
            <div className="flex items-center justify-between gap-2">
              {voiceQuery ? (
                editingVoiceQuery ? (
                  <input
                    autoFocus
                    value={voiceQuery}
                    onChange={(e) => setVoiceQuery(e.target.value)}
                    onBlur={() => setEditingVoiceQuery(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingVoiceQuery(false);
                        Promise.all([searchSpotify(voiceQuery), searchMovies(voiceQuery), searchVideos(voiceQuery)]);
                      }
                    }}
                    className="text-xs bg-stone-800 border border-amber-400 rounded px-2 py-1 text-stone-100 flex-1 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingVoiceQuery(true)}
                    className="text-xs text-stone-400 italic flex items-center gap-1 hover:text-amber-400 transition-colors"
                    title="Tap to correct"
                  >
                    🎤 &ldquo;{voiceQuery}&rdquo; ✏️
                  </button>
                )
              ) : <span />}
              <button
                onClick={clearSearchState}
                className="text-xs text-stone-500 hover:text-stone-300 active:scale-95 shrink-0"
              >
                Clear ✕
              </button>
            </div>
            {voiceQuery && memories.some((m) => m.type === "list") && (
              <button
                onClick={() => setShowAddToListSheet(true)}
                className="self-start text-xs text-stone-400 border border-stone-700 rounded-full px-3 py-1 hover:border-amber-500/50 hover:text-amber-400 active:scale-95 active:bg-stone-800 transition-all"
              >
                📋 Add &ldquo;{voiceQuery}&rdquo; to a list
              </button>
            )}
          </div>
        )}

        {/* ── Music results — one section per search ── */}
        {musicBatches.map((batch, batchIdx) => (
          <div key={batch.query + batch.time} className={`mt-3 space-y-2 rounded-xl p-2 ${batchIdx > 0 ? "bg-amber-950/40 border border-amber-700/40" : ""}`}>
            <div className="flex items-center gap-2 px-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${batchIdx > 0 ? "text-amber-500" : "text-stone-400"}`}>🎵 Music</p>
              {batchIdx > 0 && <span className="text-[10px] text-amber-600/80 italic">&ldquo;{batch.query}&rdquo;</span>}
            </div>
            {batch.items.map((track, i) => {
              const isSelected = selectedItems.some(s => s.title === track.title && s.kind === "music" && s.artist === track.artist);
              return (
                <div key={i} onClick={() => {
                  const idx = selectedItems.findIndex(s => s.title === track.title && s.kind === "music" && s.artist === track.artist);
                  if (idx >= 0) removeFromSelection(idx);
                  else addToSelection({ kind: "music", title: track.title || "", image: track.image, artist: track.artist, url: track.url });
                }}
                  className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-colors ${isSelected ? "border-amber-400 bg-amber-50" : "bg-white hover:bg-gray-50"}`}
                >
                  {track.image && <img src={track.image} className="w-12 h-12 rounded" alt={track.title} />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{track.title}</p>
                    <p className="text-xs text-gray-500">{track.artist}</p>
                  </div>
                  {isSelected && <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">✓</span></div>}
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Video results — one section per search ── */}
        {videoBatches.map((batch, batchIdx) => (
          <div key={batch.query + batch.time} className={`mt-3 space-y-2 rounded-xl p-2 ${batchIdx > 0 ? "bg-amber-950/40 border border-amber-700/40" : ""}`}>
            <div className="flex items-center gap-2 px-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${batchIdx > 0 ? "text-amber-500" : "text-stone-400"}`}>🎥 Videos</p>
              {batchIdx > 0 && <span className="text-[10px] text-amber-600/80 italic">&ldquo;{batch.query}&rdquo;</span>}
            </div>
            {batch.items.map((video, i) => {
              const isSelected = selectedItems.some(s => s.videoId === video.videoId && s.kind === "video");
              return (
                <div key={i} onClick={() => {
                  const idx = selectedItems.findIndex(s => s.videoId === video.videoId && s.kind === "video");
                  if (idx >= 0) removeFromSelection(idx);
                  else addToSelection({ kind: "video", title: video.title ?? "", image: video.thumbnail, videoId: video.videoId });
                }}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "border-amber-400 bg-amber-50" : "bg-white hover:bg-gray-50"}`}
                >
                  <img src={video.thumbnail} className="w-12 h-12 rounded" alt={video.title} />
                  <p className="text-sm flex-1">{video.title}</p>
                  {isSelected && <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">✓</span></div>}
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Movie results — one section per search ── */}
        {movieBatches.map((batch, batchIdx) => (
          <div key={batch.query + batch.time} className={`mt-3 space-y-2 rounded-xl p-2 ${batchIdx > 0 ? "bg-amber-950/40 border border-amber-700/40" : ""}`}>
            <div className="flex items-center gap-2 px-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${batchIdx > 0 ? "text-amber-500" : "text-stone-400"}`}>🎬 Movies &amp; Series</p>
              {batchIdx > 0 && <span className="text-[10px] text-amber-600/80 italic">&ldquo;{batch.query}&rdquo;</span>}
            </div>
            {batch.items.map((movie) => {
              const isSelected = selectedItems.some(s => s.title === movie.title && s.kind === "movie" && s.year === movie.year);
              return (
                <div key={movie.id} onClick={() => {
                  const idx = selectedItems.findIndex(s => s.title === movie.title && s.kind === "movie" && s.year === movie.year);
                  if (idx >= 0) removeFromSelection(idx);
                  else addToSelection({ kind: "movie", title: movie.title, image: movie.poster, year: movie.year, movieId: movie.id });
                }}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? "border-amber-400 bg-amber-50" : "bg-white hover:bg-gray-50"}`}
                >
                  {movie.poster
                    ? <img src={movie.poster} className="w-10 h-14 rounded object-cover" alt={movie.title} />
                    : <div className="w-10 h-14 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">?</div>
                  }
                  <div className="flex-1">
                    <p className="text-sm font-medium">{movie.title}</p>
                    <p className="text-xs text-gray-400">
                      {movie.year}
                      {movie.mediaType === "tv" && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 rounded px-1 py-0.5 font-medium">Series</span>}
                    </p>
                  </div>
                  {isSelected && <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">✓</span></div>}
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Floating bag button ── */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-1">
            <span className="text-[10px] text-amber-300 bg-stone-900/80 backdrop-blur-sm rounded-full px-2 py-0.5 whitespace-nowrap">
              Search again to add more
            </span>
            <button
              onClick={() => setShowBag(true)}
              className={`bg-gradient-to-br from-amber-400 to-orange-400 text-stone-900 rounded-full w-16 h-16 shadow-2xl flex flex-col items-center justify-center transition-all active:scale-90 active:from-amber-500 active:to-orange-500 ${bagBump ? "animate-bag-bump" : ""}`}
            >
              <span className="text-2xl leading-none">🎒</span>
              <span className="text-xs font-bold leading-none mt-0.5">{selectedItems.length}</span>
            </button>
          </div>
        )}

        {/* ── Bag slide-up panel ── */}
        {showBag && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowBag(false)}>
            <div
              className="bg-stone-900 border-t border-stone-700 rounded-t-2xl p-5 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-stone-100 font-semibold text-lg">🎒 Your Stash</h3>
                <span className="text-xs text-stone-500">{selectedItems.length}/10 items</span>
              </div>
              <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
                {selectedItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-stone-800 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.kind === "movie" ? "🎬" : item.kind === "video" ? "🎥" : "🎵"}</span>
                      <div>
                        <p className="text-sm text-stone-100 font-medium leading-tight">{item.title}</p>
                        {item.artist && <p className="text-xs text-stone-400">{item.artist}</p>}
                        {item.year && <p className="text-xs text-stone-400">{item.year}</p>}
                      </div>
                    </div>
                    <button onClick={() => removeFromSelection(i)} className="text-stone-500 hover:text-red-400 active:text-red-500 active:scale-90 transition-all text-lg ml-2">✕</button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowBag(false); selectedItems.length === 1 ? saveSeparately() : setShowPlaylistModal(true); }}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-stone-900 font-bold py-3.5 rounded-xl text-base shadow-lg transition-all active:scale-95 active:from-amber-500 active:to-orange-500"
              >
                Stash it! 🎉
              </button>
              <button onClick={() => { setShowBag(false); clearSearchState(); }} className="w-full text-stone-500 text-sm py-2 mt-1 rounded-xl transition-all active:text-stone-300 active:bg-stone-800">
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* ── New list modal ── */}
        {showListModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-stone-100 font-semibold mb-1">📝 New List</h3>
              <p className="text-stone-400 text-sm mb-4">Create a shopping list, task list, or anything you want to track and check off.</p>

              <input
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                placeholder="List name (e.g. Grocery List)"
                className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none mb-3"
                autoFocus
              />

              <textarea
                value={newListItemInput}
                onChange={(e) => setNewListItemInput(e.target.value)}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                placeholder={"Items (one per line):\nMilk\nEggs\nBread"}
                rows={5}
                className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none resize-none mb-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowListModal(false); setListTitle(""); setNewListItemInput(""); }}
                  className="flex-1 py-2 text-stone-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={!listTitle.trim()}
                  onClick={createList}
                  className="flex-1 bg-amber-400 text-stone-900 font-semibold py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create List
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Feedback modal ── */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-sm">
              {feedbackSent ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">🙏</div>
                  <h3 className="text-stone-100 font-semibold mb-1">Thanks for the feedback!</h3>
                  <p className="text-stone-400 text-sm mb-4">It goes directly to the team and helps make Stash better.</p>
                  <button onClick={() => setShowFeedbackModal(false)} className="text-amber-400 text-sm font-medium">Close</button>
                </div>
              ) : (
                <>
                  <h3 className="text-stone-100 font-semibold mb-1">Share your thoughts</h3>
                  <p className="text-stone-400 text-sm mb-4">What's working? What's missing? What's confusing?</p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your feedback here…"
                    rows={4}
                    className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none resize-none mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="flex-1 py-2 text-stone-500 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!feedbackText.trim()}
                      onClick={async () => {
                        if (!user || !feedbackText.trim()) return;
                        try {
                          await addDoc(collection(db, "feedback"), {
                            uid: user.uid,
                            email: user.email,
                            message: feedbackText.trim(),
                            createdAt: serverTimestamp(),
                          });
                          setFeedbackSent(true);
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : String(err);
                          console.error("FEEDBACK ERROR:", msg);
                          alert("Failed to send feedback: " + msg);
                        }
                      }}
                      className="flex-1 bg-amber-400 text-stone-900 font-semibold py-2 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Playlist modal ── */}
        {showPlaylistModal && (() => {
          const playlistType = getPlaylistType();
          const typeLabel = playlistType === "music" ? "🎵 Music" : playlistType === "movie" ? "🎬 Movie" : playlistType === "video" ? "🎥 Video" : "🎶 Mixed";
          const existingPlaylists = memories.filter(
            (m) => m.type === "playlist" && (m.playlistType === playlistType || (!m.playlistType && playlistType !== "mixed"))
          );
          return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
              <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col">
                <h3 className="text-stone-100 font-semibold mb-0.5">Save {selectedItems.length} {typeLabel} item{selectedItems.length > 1 ? "s" : ""}</h3>
                <p className="text-stone-400 text-sm mb-4">How would you like to save these?</p>

                <div className="space-y-2 overflow-y-auto flex-1">
                  {/* Existing playlists */}
                  {existingPlaylists.length > 0 && (
                    <div className="mb-1">
                      <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Add to existing playlist</p>
                      {existingPlaylists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => { addToExistingPlaylist(pl.id); setShowPlaylistModal(false); }}
                          className="w-full bg-stone-800 border border-stone-600 text-stone-200 py-2.5 rounded-xl text-sm font-medium text-left px-4 mb-2 hover:border-amber-500/50 transition-colors"
                        >
                          {pl.text}
                          <p className="text-xs text-stone-500 mt-0.5 font-normal">{(pl.items || []).length} items</p>
                        </button>
                      ))}
                      <p className="text-xs text-stone-600 text-center my-3">— or —</p>
                    </div>
                  )}

                  {/* Create new */}
                  <button
                    onClick={() => { saveAsPlaylist(); setShowPlaylistModal(false); }}
                    className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-400 py-3 rounded-xl text-sm font-medium text-left px-4"
                  >
                    🎶 Create new playlist
                    <p className="text-xs text-amber-500/60 mt-0.5 font-normal">All items in one card</p>
                  </button>

                  {/* Save separately */}
                  <button
                    onClick={() => { saveSeparately(); setShowPlaylistModal(false); }}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-300 py-3 rounded-xl text-sm font-medium text-left px-4"
                  >
                    📋 Save Separately
                    <p className="text-xs text-stone-500 mt-0.5 font-normal">One card per item</p>
                  </button>

                  <button onClick={() => setShowPlaylistModal(false)} className="w-full text-stone-500 py-2 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Saved Memories divider ── */}
        <div className="flex items-center gap-3 mt-6 mb-4">
          <div className="flex-1 h-px bg-stone-700" />
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest whitespace-nowrap">📦 Your Stash</span>
          <div className="flex-1 h-px bg-stone-700" />
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved memories..."
          className="bg-stone-800 border border-stone-600 p-3 w-full rounded-lg text-base text-stone-100 placeholder-stone-500 mb-2 focus:outline-none"
        />

        {search && (
          <p className="text-sm text-stone-500 mb-2">
            {filteredMemories.length} result(s)
          </p>
        )}

        {/* Sort & Filter bar */}
        <div className="mb-4 space-y-2">
          {/* Sort row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-stone-500 uppercase tracking-widest mr-1">Sort</span>
            {([["newest", "Newest"], ["oldest", "Oldest"], ["az", "A–Z"], ["type", "Type"], ["custom", "Custom ↕"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all active:scale-90 ${
                  sortBy === val
                    ? "bg-amber-400 text-stone-900 border-amber-400 font-semibold"
                    : "bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-stone-500 uppercase tracking-widest mr-1">Show</span>
            {([
              [null, "All"],
              ["playlist", "🎵 Playlists"],
              ["list", "📋 Lists"],
              ["pic", "📸 Pics"],
              ["note", "📝 Notes"],
            ] as const).map(([val, label]) => (
              <button
                key={String(val)}
                onClick={() => setFilterType(val)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all active:scale-90 ${
                  filterType === val
                    ? "bg-amber-400 text-stone-900 border-amber-400 font-semibold"
                    : "bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Clear filters + collapse all row */}
          <div className="flex items-center gap-3 flex-wrap">
            {search && (
              <button onClick={() => setSearch("")} className="text-sm text-stone-500 hover:text-stone-300 transition">
                Clear search
              </button>
            )}
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="text-sm text-purple-500">
                Clear tag: #{activeTag}
              </button>
            )}
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={() => {
                  setCollapseAll(true);
                  try {
                    const allIds = memories.map((m) => m.id);
                    const stored: string[] = JSON.parse(localStorage.getItem("stash_collapsed") || "[]");
                    localStorage.setItem("stash_collapsed", JSON.stringify([...new Set([...stored, ...allIds])]));
                  } catch { /* silent */ }
                  setTimeout(() => setCollapseAll(null), 100);
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-all active:scale-90"
                title="Collapse all cards"
              >&#x229F; Min all</button>
              <button
                onClick={() => {
                  setCollapseAll(false);
                  try {
                    const allIds = memories.map((m) => m.id);
                    const stored: string[] = JSON.parse(localStorage.getItem("stash_collapsed") || "[]");
                    localStorage.setItem("stash_collapsed", JSON.stringify(stored.filter((id) => !allIds.includes(id))));
                  } catch { /* silent */ }
                  setTimeout(() => setCollapseAll(null), 100);
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-all active:scale-90"
                title="Expand all cards"
              >&#x229E; Max all</button>
            </div>
          </div>
        </div>

        {filteredMemories.length === 0 ? (
          <p className="text-center text-stone-600 mt-6">
            No memories yet — start capturing your story ✨
          </p>
        ) : sortBy === "custom" ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredMemories.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {filteredMemories.map((m) => (
                  <SortableMemoryCard
                    key={m.id}
                    memory={m}
                    showDragHandle={true}
                    onDelete={deleteMemory}
                    onToggleCheck={toggleCheck}
                    onAddListItem={addItemToList}
                    onRemoveListItems={removeListItems}
                    onPin={togglePin}
                    collapsedOverride={collapseAll}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-4">
            {filteredMemories.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onDelete={deleteMemory}
                onToggleCheck={toggleCheck}
                onAddListItem={addItemToList}
                onRemoveListItems={removeListItems}
                onPin={togglePin}
                collapsedOverride={collapseAll}
              />
            ))}
          </div>
        )}

      </div>

      {showOnboarding && (
        <OnboardingModal onDone={() => {
          localStorage.setItem("stash_onboarded", "1");
          setShowOnboarding(false);
        }} />
      )}

      {/* ── Add to list sheet ── */}
      {showAddToListSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowAddToListSheet(false)}>
          <div
            className="bg-stone-900 border-t border-stone-700 rounded-t-2xl p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-4" />
            <h3 className="text-stone-100 font-semibold text-base mb-1">📋 Add to a list</h3>
            <p className="text-stone-400 text-xs mb-4">Pick a list to add &ldquo;{voiceQuery}&rdquo; to</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {memories
                .filter((m) => m.type === "list")
                .map((list) => (
                  <button
                    key={list.id}
                    onClick={async () => {
                      await addItemToList(list.id, voiceQuery);
                      setShowAddToListSheet(false);
                    }}
                    className="w-full bg-stone-800 border border-stone-600 text-stone-200 py-3 px-4 rounded-xl text-sm font-medium text-left hover:border-amber-500/50 active:scale-95 active:bg-stone-700 transition-all"
                  >
                    {list.text}
                    <p className="text-xs text-stone-500 mt-0.5 font-normal">
                      {(list.listItems || []).length} item{(list.listItems || []).length !== 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowAddToListSheet(false)}
              className="w-full text-stone-500 text-sm py-3 mt-2 rounded-xl transition-all active:text-stone-300 active:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TMDB Attribution — required by TMDB terms of use */}
      <p className="text-center text-[10px] text-stone-600 py-2">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  );
}
