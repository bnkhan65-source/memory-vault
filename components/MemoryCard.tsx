"use client";

import { useRef, useState, useEffect } from "react";
import { MEMORY_TYPE_META } from "@/lib/memoryTypes";
import { auth, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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
  pinned?: boolean;
};

type Props = {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
  onToggleCheck?: (memoryId: string, index: number, currentChecked: number[]) => void;
  onAddListItem?: (memoryId: string, item: string) => void;
  onRemoveListItems?: (memoryId: string, indicesToRemove: number[]) => void;
  onPin?: (id: string, pinned: boolean) => void;
  dragHandleProps?: Record<string, any>;
  collapsedOverride?: boolean | null;
};

export default function MemoryCard({
  memory,
  onDelete,
  onUpdate,
  onRemoveListItems,
  onToggleCheck,
  onAddListItem,
  onPin,
  dragHandleProps,
  collapsedOverride,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      // Default collapsed — only expanded if user explicitly opened it
      const expanded: string[] = JSON.parse(localStorage.getItem("stash_expanded") || "[]");
      return !expanded.includes(memory.id);
    } catch { return true; }
  });

  // Sync when a "collapse all / expand all" override is fired from the parent
  useEffect(() => {
    if (collapsedOverride == null) return;
    setIsCollapsed(collapsedOverride);
    try {
      const expanded: string[] = JSON.parse(localStorage.getItem("stash_expanded") || "[]");
      const updated = collapsedOverride
        ? expanded.filter((id) => id !== memory.id)   // collapsing → remove from expanded
        : [...new Set([...expanded, memory.id])];      // expanding → add to expanded
      localStorage.setItem("stash_expanded", JSON.stringify(updated));
    } catch { /* silent */ }
  }, [collapsedOverride, memory.id]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text || "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const [checkedItems, setCheckedItems] = useState<number[]>(
    memory.checked || []
  );
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addItemInput, setAddItemInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const listMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoUrlRef = useRef<string | null>(null);

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
      const photoUrl = pendingPhotoUrlRef.current;
      const encoded = photoUrl
        ? JSON.stringify({ text: addItemInput.trim(), imageUrl: photoUrl })
        : addItemInput.trim();
      onAddListItem(memory.id, encoded);
      setAddItemInput("");
      pendingPhotoUrlRef.current = null;
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAddItemInput(text.trim());
    } catch {
      // Clipboard access denied or not supported — silent fail
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
    pendingPhotoUrlRef.current = null;
    try {
      const uid = auth.currentUser?.uid;
      const token = await auth.currentUser?.getIdToken();
      if (!token || !uid) return;

      // Upload photo to Storage so we can show it alongside the text
      const ext = file.name.split(".").pop() || "jpg";
      const sRef = storageRef(storage, `listImages/${uid}/${Date.now()}.${ext}`);
      await uploadBytes(sRef, file);
      const imageUrl = await getDownloadURL(sRef);
      pendingPhotoUrlRef.current = imageUrl;

      // Identify what's in the photo
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

  // Short label shown when card is collapsed
  const previewLabel = (() => {
    if (memory.type === "list") {
      return resolvedListTitle || (resolvedListItems.length > 0 ? `${resolvedListItems.length} items` : "Empty list");
    }
    if (memory.type === "playlist") {
      return memory.text || (memory.items?.length ? `${memory.items.length} items` : "Empty playlist");
    }
    return memory.text || "";
  })();

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
        if (individualMusicItem) return;
        if (memory.videoUrl) { window.open(memory.videoUrl, "_blank"); return; }
        // No longer entering edit mode on card tap — use the ✏️ button instead
      }}
      className={`bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-sm flex gap-3 items-start transition-all duration-150 ease-out cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:bg-stone-750 hover:border-slate-600
        ${isPulsing ? "scale-[1.03] shadow-lg" : ""}
        ${isPressed ? "scale-[0.97]" : ""}
      `}
    >
      {/* Left-side image — hidden when collapsed */}
      {memory.imageUrl && !isCollapsed && (
        <div className="relative shrink-0 w-20 h-20">
          <img
            src={memory.imageUrl}
            alt="Memory"
            onClick={(e) => {
              e.stopPropagation();
              if (individualMusicItem) window.open(getMusicUrl(individualMusicItem), "_blank");
              else if (memory.videoUrl) window.open(memory.videoUrl, "_blank");
              else setLightboxOpen(true);
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

      {/* Photo lightbox — full-screen with pinch-to-zoom */}
      {lightboxOpen && memory.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onTouchEnd={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            onTouchEnd={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 text-white text-3xl font-light leading-none z-20 bg-black/60 rounded-full w-14 h-14 flex items-center justify-center active:bg-black/80"
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={memory.imageUrl}
            alt="Memory"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{ touchAction: "pinch-zoom", maxWidth: "100%", maxHeight: "100%" }}
            className="object-contain select-none"
          />
        </div>
      )}

      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="shrink-0 flex items-center px-1 cursor-grab active:cursor-grabbing touch-none text-slate-600 hover:text-slate-400 self-stretch"
        >
          ⠿
        </div>
      )}

      {/* Right-side content */}
      <div className="flex-1 min-w-0">
        {/* Category + Type badges + preview (when collapsed) + Pin + Collapse toggle */}
        <div className={`flex items-center gap-2 flex-wrap ${isCollapsed ? "" : "mb-3"}`}>
          {memory.category && (
            <span className="text-xs px-3 py-1 bg-gray-800 text-white rounded-full font-medium">
              {memory.category}
            </span>
          )}
          {memory.type && (
            <span className={`text-xs px-3 py-1 rounded-full ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
          )}
          {/* Inline preview title shown only when collapsed */}
          {isCollapsed && previewLabel && (
            <span className="text-sm text-slate-300 truncate flex-1 min-w-0">
              {previewLabel}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {onPin && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(memory.id, !!memory.pinned); }}
                className={`text-base transition-all active:scale-90 ${memory.pinned ? "opacity-100" : "opacity-30 hover:opacity-60"}`}
                title={memory.pinned ? "Unpin" : "Pin to top"}
              >
                📌
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = !isCollapsed;
                setIsCollapsed(next);
                try {
                  const expanded: string[] = JSON.parse(localStorage.getItem("stash_expanded") || "[]");
                  const updated = next
                    ? expanded.filter((id) => id !== memory.id)   // collapsing → remove from expanded
                    : [...new Set([...expanded, memory.id])];      // expanding → add to expanded
                  localStorage.setItem("stash_expanded", JSON.stringify(updated));
                } catch { /* silent */ }
              }}
              className="text-slate-500 hover:text-slate-300 active:text-violet-400 transition-all px-1 py-0.5 rounded text-xs"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
          </div>
        </div>

        {/* Playlist rendering */}
        {!isCollapsed && memory.type === "playlist" && memory.items && (
          <div className="space-y-1 mt-1">
            {/* Export panel for music playlists */}
            {(memory.playlistType === "music" || (!memory.playlistType && memory.items.every(i => i.kind === "music"))) && (
              <div className="mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExport(!showExport); }}
                  className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded-full hover:bg-stone-600 transition"
                >
                  {showExport ? "Hide" : `↗ Open in ${serviceLabel}`}
                </button>
                {showExport && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-2 bg-slate-900 border border-slate-600 rounded-xl p-3 space-y-3">
                    {/* Service picker */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Open songs in:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SERVICES.map((svc) => (
                          <button
                            key={svc.id}
                            onClick={() => selectService(svc.id)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                              preferredService === svc.id
                                ? `${svc.color} text-white`
                                : "bg-stone-200 text-slate-500"
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
                          className="flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 hover:border-slate-500 transition-colors active:bg-slate-700"
                        >
                          {item.image && (
                            <img src={item.image} className="w-10 h-10 rounded object-cover shrink-0" alt={item.title} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-100 truncate">{item.title}</p>
                            {item.artist && <p className="text-xs text-slate-400 truncate">{item.artist}</p>}
                          </div>
                          <span className="text-slate-400 text-sm shrink-0">↗</span>
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
                  <span className="text-sm text-slate-200 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-slate-400">{expandedItem === i ? "▲" : "▼"}</span>
                </button>
                {expandedItem === i && (
                  <div className="flex gap-3 pl-5 pb-2 pt-1">
                    {item.image && (
                      <img src={item.image} className="w-12 h-14 rounded object-cover shrink-0" alt={item.title} />
                    )}
                    <div className="text-xs text-slate-400 space-y-1">
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
                                      : "bg-slate-700 text-slate-300 border-slate-600"
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
        {!isCollapsed && memory.type === "list" && (
          <div className="space-y-1">
            {resolvedListTitle && (
              <p className="text-sm font-semibold text-slate-100 mb-2">{resolvedListTitle}</p>
            )}
            {resolvedListItems.map((item, index) => {
              // Items may be plain strings or JSON-encoded { text, imageUrl } objects
              let itemText = item;
              let itemImage: string | null = null;
              try {
                const parsed = JSON.parse(item);
                if (parsed?.text) { itemText = parsed.text; itemImage = parsed.imageUrl || null; }
              } catch { /* plain string, no-op */ }

              return (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCheck(index); }}
                    className="w-8 h-8 flex items-center justify-center text-lg text-slate-400 rounded-md active:bg-slate-700 shrink-0 mt-0.5"
                  >
                    {checkedItems.includes(index) ? "☑" : "☐"}
                  </button>
                  <div className="flex flex-col gap-1 flex-1">
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt={itemText}
                        onClick={(e) => { e.stopPropagation(); window.open(itemImage!, "_blank"); }}
                        className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                      />
                    )}
                    {/^https?:\/\//i.test(itemText) ? (
                      <a
                        href={itemText}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`underline break-all ${checkedItems.includes(index) ? "line-through text-slate-500" : "text-sky-400"}`}
                      >
                        {(() => { try { return new URL(itemText).hostname.replace(/^www\./, ""); } catch { return itemText; } })()}
                      </a>
                    ) : (
                      <span className={checkedItems.includes(index) ? "line-through text-slate-500" : "text-slate-100"}>
                        {itemText}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {checkedItems.length > 0 && onRemoveListItems && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Map visual indices (from resolvedListItems) back to actual memory.listItems indices
                  const actualIndices = checkedItems.map((visualIdx) => {
                    const item = resolvedListItems[visualIdx];
                    return (memory.listItems || []).indexOf(item);
                  }).filter((i) => i !== -1);
                  onRemoveListItems(memory.id, actualIndices);
                  setCheckedItems([]);
                }}
                className="text-xs text-slate-500 hover:text-red-400 active:text-red-500 transition-all mt-2"
              >
                🗑 Clear checked ({checkedItems.length})
              </button>
            )}
            {onAddListItem && (
              <div className="flex flex-col gap-2 mt-3">
                <input
                  value={addItemInput}
                  onChange={(e) => { setAddItemInput(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleAddItem(); } }}
                  onClick={(e) => { e.stopPropagation(); }}
                  onTouchStart={(e) => { e.stopPropagation(); }}
                  onTouchEnd={(e) => { e.stopPropagation(); }}
                  placeholder={isListening ? "Listening…" : isIdentifying ? "Identifying…" : "Add item..."}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-stone-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); startListMic(); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm ${isListening ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300"}`}
                  >
                    {isListening ? "⏹️ Stop" : "🎤 Speak"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}
                    disabled={isIdentifying}
                    className="flex-1 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 disabled:opacity-50"
                  >
                    {isIdentifying ? "🔍 …" : "📷 Photo"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePasteClipboard(); }}
                    className="flex-1 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300"
                    title="Paste from clipboard"
                  >
                    📋 Paste
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                    className="flex-1 py-1.5 bg-violet-500 text-white rounded-lg text-sm font-bold"
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
        {!isCollapsed && memory.type !== "list" && memory.type !== "playlist" && (
          <div>
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                <p className="text-[10px] text-violet-400 font-medium uppercase tracking-wide">Editing description</p>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="w-full bg-slate-700 border border-violet-500/50 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-400 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditText(memory.text || ""); setIsEditing(false); }}
                    className="flex-1 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-400 border border-slate-600 active:bg-stone-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-1.5 rounded-lg text-sm bg-violet-500 text-stone-900 font-semibold active:bg-violet-600 transition-all"
                  >
                    Save ✓
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-100 break-words flex-1">
                  {editText}
                </p>
                {!individualMusicItem && !memory.videoUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="shrink-0 text-slate-600 hover:text-slate-400 active:text-violet-400 active:scale-90 transition-all p-1 -mt-0.5"
                    title="Edit description"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
            {justSaved && (
              <p className="text-[10px] text-green-500 mt-1">Saved ✓</p>
            )}
          </div>
        )}

        {/* Music service picker for individual music cards */}
        {!isCollapsed && individualMusicItem && (
          <div onClick={(e) => e.stopPropagation()} className="mt-3">
            <p className="text-[10px] text-slate-400 mb-1.5">Open in:</p>
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
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:border-stone-400"
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
        {!isCollapsed && memory.videoUrl && memory.type !== "link" && (
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

        {/* Link memory — open URL button */}
        {!isCollapsed && memory.type === "link" && memory.videoUrl && (
          <a
            href={memory.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded-full text-xs transition-colors"
          >
            🔗 Open link
          </a>
        )}

        {/* Delete — hidden when collapsed */}
        {!isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(memory.id);
            }}
            className="text-red-400 text-xs mt-3 transition-all active:text-red-600 active:scale-90"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
