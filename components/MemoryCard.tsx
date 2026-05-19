"use client";

import { useRef, useState } from "react";
import { MEMORY_TYPE_META } from "@/lib/memoryTypes";
import { auth } from "@/lib/firebase";

type PlaylistItem = {
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
  spotifyUrl?: string | null;
  videoUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
  type?: keyof typeof MEMORY_TYPE_META;
  playlistType?: "music" | "movie" | "video" | "mixed";
  checked?: number[];
  items?: PlaylistItem[];
  listItems?: string[];
};

type Props = {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
  onToggleCheck?: (memoryId: string, index: number, currentChecked: number[]) => void;
  onAddListItem?: (memoryId: string, item: string) => void;
};

export default function MemoryCard({
  memory,
  onDelete,
  onUpdate,
  onToggleCheck,
  onAddListItem,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text || "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const [checkedItems, setCheckedItems] = useState<number[]>(
    memory.checked || []
  );
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addItemInput, setAddItemInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const listMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  type MusicService = "apple" | "spotify" | "youtube" | "amazon";
  const [preferredService, setPreferredService] = useState<MusicService>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("musicService") as MusicService) || "apple";
    }
    return "apple";
  });

  const SERVICES: { id: MusicService; label: string; color: string; short: string }[] = [
    { id: "apple",   label: "Apple Music",   short: "Apple",   color: "bg-rose-500" },
    { id: "spotify", label: "Spotify",       short: "Spotify", color: "bg-green-500" },
    { id: "youtube", label: "YouTube Music", short: "YouTube", color: "bg-red-500" },
    { id: "amazon",  label: "Amazon Music",  short: "Amazon",  color: "bg-blue-500" },
  ];

  // ── Affiliate tokens — replace with real values once approved ──────────────
  const APPLE_AFFILIATE_TOKEN = "APPLE_TOKEN_HERE";   // affiliate.itunes.apple.com
  const AMAZON_AFFILIATE_TAG  = "stashapp20-20";      // affiliate-program.amazon.com

  const getMusicUrl = (item: PlaylistItem): string => {
    const q = encodeURIComponent(`${item.title}${item.artist ? " " + item.artist : ""}`);
    switch (preferredService) {
      case "apple":   return item.url
        ? `${item.url}${item.url.includes("?") ? "&" : "?"}at=${APPLE_AFFILIATE_TOKEN}`
        : `https://music.apple.com/search?term=${q}&at=${APPLE_AFFILIATE_TOKEN}`;
      case "spotify": return `https://open.spotify.com/search/${q}`;
      case "youtube": return `https://music.youtube.com/search?q=${q}`;
      case "amazon":  return `https://music.amazon.com/search/${q}?tag=${AMAZON_AFFILIATE_TAG}`;
    }
  };

  const selectService = (svc: MusicService) => {
    setPreferredService(svc);
    localStorage.setItem("musicService", svc);
  };

  const meta =
    MEMORY_TYPE_META[memory.type || "note"] ||
    MEMORY_TYPE_META.note;

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(memory.id, editText);
    }

    setIsEditing(false);
    setJustSaved(true);

    setTimeout(() => {
      setJustSaved(false);
    }, 1500);
  };

  const toggleCheck = (index: number) => {
    const updatedChecked = checkedItems.includes(index)
      ? checkedItems.filter((i) => i !== index)
      : [...checkedItems, index];

    setCheckedItems(updatedChecked);

    if (onToggleCheck) {
      onToggleCheck(memory.id, index, checkedItems);
    }
  };

  // Resolve list items — prefer structured listItems, fall back to comma-parsing
  // Never parse memory.text for playlist cards (it's just the card title like "🎵 Playlist (5 items)")
  const hasStructuredItems = Array.isArray(memory.listItems);
  const resolvedListTitle = hasStructuredItems ? (memory.text || null) : null;
  const resolvedListItems = hasStructuredItems
    ? memory.listItems!.filter((item) => item !== resolvedListTitle)
    : memory.type === "playlist"
      ? []
      : (memory.text || "").split(",").map((s) => s.trim()).filter(Boolean);

  const handleAddItem = () => {
    if (onAddListItem && addItemInput.trim()) {
      onAddListItem(memory.id, addItemInput.trim());
      setAddItemInput("");
    }
  };

  const startListMic = async () => {
    if (isListening) {
      listMediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsListening(false);
        try {
          const token = await auth.currentUser?.getIdToken();
          if (!token) return;
          const blob = new Blob(chunks, { type: mimeType });
          const ext = mimeType === "audio/mp4" ? "m4a" : "webm";
          const fd = new FormData();
          fd.append("file", blob, `recording.${ext}`);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          const data = await res.json();
          if (data.text) setAddItemInput(data.text.trim().replace(/[.,!?;:]+$/, ""));
        } catch (err) {
          console.error("List mic transcription error:", err);
        }
      };

      recorder.start();
      setIsListening(true);
      listMediaRecorderRef.current = recorder;
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 4000);
    } catch (err) {
      console.error("List mic error:", err);
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("Microphone access denied.\n\niPhone fix:\n1. Tap the page icon (monitor) in the Safari address bar\n2. Tap the three dots (...)\n3. Under Website Settings, tap Microphone\n4. Set to Allow\n\nThen try again.");
      } else {
        alert("Microphone access denied. Please allow microphone access in your browser settings.");
      }
    }
  };

  const identifyPhoto = async (file: File) => {
    setIsIdentifying(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/identify-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.item) setAddItemInput(data.item);
    } catch (err) {
      console.error("Identify photo error:", err);
    } finally {
      setIsIdentifying(false);
    }
  };

  // For individual music cards — parse title/artist from "Title — Artist" text
  const individualMusicItem: PlaylistItem | null =
    memory.spotifyUrl && memory.type !== "playlist"
      ? (() => {
          const parts = (memory.text || "").split(" — ");
          return {
            kind: "music",
            title: parts[0]?.trim() || memory.text || "",
            artist: parts[1]?.trim(),
            url: memory.spotifyUrl || undefined,
          };
        })()
      : null;

  const serviceLabel = SERVICES.find((s) => s.id === preferredService)?.label || "Music";

  return (
    <div
      ref={cardRef}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onClick={() => {
        if (memory.type === "list" || memory.type === "playlist") return;

        // Music cards — tap opens in preferred service
        if (individualMusicItem) return;

        // Video cards — tap to watch
        if (memory.videoUrl) {
          window.open(memory.videoUrl, "_blank");
          return;
        }

        if (isEditing) {
          handleSaveEdit();
          return;
        }

        setIsEditing(true);
      }}
      className={`bg-stone-800 border border-stone-700 p-4 rounded-xl shadow-sm flex gap-3 items-start transition-all duration-150 ease-out cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:bg-stone-750 hover:border-stone-600
        ${isPulsing ? "scale-[1.03] shadow-lg" : ""}
        ${isPressed ? "scale-[0.97]" : ""}
      `}
    >
      {/* Left-side image */}
      {memory.imageUrl && (
        <div className="relative shrink-0 w-20 h-20">
          <img
            src={memory.imageUrl}
            alt="Memory"
            onClick={(e) => {
              e.stopPropagation();
              if (individualMusicItem) window.open(getMusicUrl(individualMusicItem), "_blank");
              else if (memory.videoUrl) window.open(memory.videoUrl, "_blank");
            }}
            className="w-20 h-20 rounded-lg object-cover cursor-pointer"
          />
          {memory.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg pointer-events-none">
              <span className="text-white text-xl">▶</span>
            </div>
          )}
        </div>
      )}

      {/* Right-side content */}
      <div className="flex-1 min-w-0">
        {/* Category + Type badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {memory.category && (
            <span className="text-xs px-3 py-1 bg-gray-800 text-white rounded-full font-medium">
              {memory.category}
            </span>
          )}

          {memory.type && (
            <span
              className={`text-xs px-3 py-1 rounded-full ${meta.color}`}
            >
              {meta.icon} {meta.label}
            </span>
          )}
        </div>

        {/* Playlist rendering */}
        {memory.type === "playlist" && memory.items && (
          <div className="space-y-1 mt-1">
            {/* Export panel for music playlists */}
            {(memory.playlistType === "music" || (!memory.playlistType && memory.items.every(i => i.kind === "music"))) && (
              <div className="mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExport(!showExport); }}
                  className="text-xs px-3 py-1 bg-stone-700 text-stone-300 rounded-full hover:bg-stone-600 transition"
                >
                  {showExport ? "Hide" : `↗ Open in ${serviceLabel}`}
                </button>
                {showExport && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-2 bg-stone-900 border border-stone-600 rounded-xl p-3 space-y-3">
                    {/* Service picker */}
                    <div>
                      <p className="text-xs text-stone-400 mb-2">Open songs in:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SERVICES.map((svc) => (
                          <button
                            key={svc.id}
                            onClick={() => selectService(svc.id)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                              preferredService === svc.id
                                ? `${svc.color} text-white`
                                : "bg-stone-200 text-stone-500"
                            }`}
                          >
                            {svc.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Song list — big tappable buttons */}
                    <div className="space-y-2">
                      {memory.items.filter(i => i.kind === "music").map((item, i) => (
                        <a
                          key={i}
                          href={getMusicUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-stone-800 border border-stone-600 rounded-xl px-3 py-2.5 hover:border-stone-500 transition-colors active:bg-stone-700"
                        >
                          {item.image && (
                            <img src={item.image} className="w-10 h-10 rounded object-cover shrink-0" alt={item.title} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-100 truncate">{item.title}</p>
                            {item.artist && <p className="text-xs text-stone-400 truncate">{item.artist}</p>}
                          </div>
                          <span className="text-stone-400 text-sm shrink-0">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {memory.items.map((item, i) => (
              <div key={i}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedItem(expandedItem === i ? null : i);
                  }}
                  className="flex items-center gap-2 w-full text-left py-1 hover:opacity-70 transition"
                >
                  <span className="text-xs">{item.kind === "movie" ? "🎬" : item.kind === "video" ? "🎥" : "🎵"}</span>
                  <span className="text-sm text-stone-200 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-stone-400">{expandedItem === i ? "▲" : "▼"}</span>
                </button>
                {expandedItem === i && (
                  <div className="flex gap-3 pl-5 pb-2 pt-1">
                    {item.image && (
                      <img src={item.image} className="w-12 h-14 rounded object-cover shrink-0" alt={item.title} />
                    )}
                    <div className="text-xs text-stone-400 space-y-1">
                      {item.artist && <p>{item.artist}</p>}
                      {item.year && <p>{item.year}</p>}

                      {/* Music — open in preferred service */}
                      {item.kind === "music" && (
                        <div onClick={e => e.stopPropagation()} className="mt-1">
                          <div className="flex gap-1 flex-wrap">
                            {SERVICES.map((svc) => {
                              const q = encodeURIComponent(`${item.title}${item.artist ? " " + item.artist : ""}`);
                              const href =
                                svc.id === "apple"   ? (item.url || `https://music.apple.com/search?term=${q}`) :
                                svc.id === "spotify" ? `https://open.spotify.com/search/${q}` :
                                svc.id === "youtube" ? `https://music.youtube.com/search?q=${q}` :
                                                        `https://music.amazon.com/search/${q}`;
                              return (
                                <a
                                  key={svc.id}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => selectService(svc.id)}
                                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                                    preferredService === svc.id
                                      ? `${svc.color} text-white border-transparent`
                                      : "bg-stone-700 text-stone-300 border-stone-600"
                                  }`}
                                >
                                  {svc.short}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Video — watch on YouTube */}
                      {item.kind === "video" && item.videoId && (
                        <a href={`https://www.youtube.com/watch?v=${item.videoId}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="inline-block mt-1 px-3 py-1 bg-red-600 text-white rounded-full text-xs">
                          ▶ Watch on YouTube
                        </a>
                      )}

                      {/* Movie — view on TMDB */}
                      {item.kind === "movie" && item.movieId && (
                        <a href={`https://www.themoviedb.org/movie/${item.movieId}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white rounded-full text-xs">
                          🎬 View on TMDB
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Checklist rendering */}
        {memory.type === "list" && (
          <div className="space-y-1">
            {resolvedListTitle && (
              <p className="text-sm font-semibold text-stone-100 mb-2">{resolvedListTitle}</p>
            )}
            {resolvedListItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCheck(index); }}
                  className="w-8 h-8 flex items-center justify-center text-lg text-stone-400 rounded-md active:bg-stone-700 shrink-0"
                >
                  {checkedItems.includes(index) ? "☑" : "☐"}
                </button>
                <span className={checkedItems.includes(index) ? "line-through text-stone-500" : "text-stone-100"}>
                  {item}
                </span>
              </div>
            ))}
            {onAddListItem && (
              <div className="flex flex-col gap-2 mt-3">
                <input
                  value={addItemInput}
                  onChange={(e) => { setAddItemInput(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleAddItem(); } }}
                  onClick={(e) => { e.stopPropagation(); }}
                  placeholder={isListening ? "Listening…" : isIdentifying ? "Identifying…" : "Add item..."}
                  className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 placeholder-stone-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); startListMic(); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm ${isListening ? "bg-red-500 text-white" : "bg-stone-700 text-stone-300"}`}
                  >
                    {isListening ? "⏹️ Stop" : "🎤 Speak"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}
                    disabled={isIdentifying}
                    className="flex-1 py-1.5 rounded-lg text-sm bg-stone-700 text-stone-300 disabled:opacity-50"
                  >
                    {isIdentifying ? "🔍 …" : "📷 Photo"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                    className="flex-1 py-1.5 bg-amber-400 text-white rounded-lg text-sm font-bold"
                  >
                    + Add
                  </button>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) identifyPhoto(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Text / edit rendering for non-list, non-playlist memories */}
        {memory.type !== "list" && memory.type !== "playlist" && isEditing && (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            autoFocus
          />
        )}
        {memory.type !== "list" && memory.type !== "playlist" && !isEditing && (
          <p className="text-sm font-medium text-stone-100 break-words">
            {editText}
          </p>
        )}

        {/* Saved indicator */}
        {justSaved && (
          <p className="text-[10px] text-green-500 mt-1">
            Saved ✓
          </p>
        )}

        {/* Music service picker for individual music cards */}
        {individualMusicItem && (
          <div onClick={(e) => e.stopPropagation()} className="mt-3">
            <p className="text-[10px] text-stone-400 mb-1.5">Open in:</p>
            <div className="flex gap-1.5 flex-wrap">
              {SERVICES.map((svc) => {
                const q = encodeURIComponent(`${individualMusicItem.title}${individualMusicItem.artist ? " " + individualMusicItem.artist : ""}`);
                const href =
                  svc.id === "apple"   ? (individualMusicItem.url || `https://music.apple.com/search?term=${q}`) :
                  svc.id === "spotify" ? `https://open.spotify.com/search/${q}` :
                  svc.id === "youtube" ? `https://music.youtube.com/search?q=${q}` :
                                          `https://music.amazon.com/search/${q}`;
                return (
                  <a
                    key={svc.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => selectService(svc.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      preferredService === svc.id
                        ? `${svc.color} text-white border-transparent`
                        : "bg-stone-700 text-stone-300 border-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {svc.short}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Video link */}
        {memory.videoUrl && (
          <a
            href={memory.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-block mt-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs"
          >
            ▶ Watch on YouTube
          </a>
        )}

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(memory.id);
          }}
          className="text-red-400 text-xs mt-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
