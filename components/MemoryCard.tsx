"use client";

import { useRef, useState } from "react";
import { MEMORY_TYPE_META } from "@/lib/memoryTypes";

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

  type MusicService = "apple" | "spotify" | "youtube" | "amazon";
  const [preferredService, setPreferredService] = useState<MusicService>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("musicService") as MusicService) || "apple";
    }
    return "apple";
  });

  const SERVICES: { id: MusicService; label: string; color: string }[] = [
    { id: "apple",   label: "Apple Music",   color: "bg-rose-500" },
    { id: "spotify", label: "Spotify",       color: "bg-green-500" },
    { id: "youtube", label: "YouTube Music", color: "bg-red-500" },
    { id: "amazon",  label: "Amazon Music",  color: "bg-blue-500" },
  ];

  const getMusicUrl = (item: PlaylistItem): string => {
    const q = encodeURIComponent(`${item.title}${item.artist ? " " + item.artist : ""}`);
    switch (preferredService) {
      case "apple":   return item.url || `https://music.apple.com/search?term=${q}`;
      case "spotify": return `https://open.spotify.com/search/${q}`;
      case "youtube": return `https://music.youtube.com/search?q=${q}`;
      case "amazon":  return `https://music.amazon.com/search/${q}`;
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
  const hasStructuredItems = Array.isArray(memory.listItems);
  const resolvedListTitle = hasStructuredItems ? (memory.text || null) : null;
  const resolvedListItems = hasStructuredItems
    ? memory.listItems!.filter((item) => item !== resolvedListTitle)
    : (memory.text || "").split(",").map((s) => s.trim()).filter(Boolean);

  const handleAddItem = () => {
    if (onAddListItem && addItemInput.trim()) {
      onAddListItem(memory.id, addItemInput.trim());
      setAddItemInput("");
    }
  };

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
      className={`bg-white p-4 rounded-xl shadow-sm flex gap-3 items-start transition-all duration-150 ease-out cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:bg-gray-50
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
              if (memory.spotifyUrl) window.open(memory.spotifyUrl, "_blank");
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
                  className="text-xs px-3 py-1 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition"
                >
                  {showExport ? "Hide export" : "↗ Export to Apple Music"}
                </button>
                {showExport && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-2 bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
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
                          className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-3 py-2.5 hover:border-stone-400 transition-colors active:bg-stone-100"
                        >
                          {item.image && (
                            <img src={item.image} className="w-10 h-10 rounded object-cover shrink-0" alt={item.title} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{item.title}</p>
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
                  <span className="text-sm text-gray-800 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-gray-400">{expandedItem === i ? "▲" : "▼"}</span>
                </button>
                {expandedItem === i && (
                  <div className="flex gap-3 pl-5 pb-2 pt-1">
                    {item.image && (
                      <img src={item.image} className="w-12 h-14 rounded object-cover shrink-0" alt={item.title} />
                    )}
                    <div className="text-xs text-gray-500 space-y-1">
                      {item.artist && <p>{item.artist}</p>}
                      {item.year && <p>{item.year}</p>}

                      {/* Music — open in Apple Music */}
                      {item.kind === "music" && item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="inline-block mt-1 px-3 py-1 bg-gray-800 text-white rounded-full text-xs">
                          🎵 Open in Apple Music
                        </a>
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
              <p className="text-sm font-semibold text-gray-800 mb-2">{resolvedListTitle}</p>
            )}
            {resolvedListItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCheck(index); }}
                  className="w-8 h-8 flex items-center justify-center text-lg text-gray-500 rounded-md active:bg-gray-100 shrink-0"
                >
                  {checkedItems.includes(index) ? "☑" : "☐"}
                </button>
                <span className={checkedItems.includes(index) ? "line-through text-gray-400" : "text-gray-800"}>
                  {item}
                </span>
              </div>
            ))}
            {onAddListItem && (
              <div className="flex gap-2 mt-3">
                <input
                  value={addItemInput}
                  onChange={(e) => { setAddItemInput(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleAddItem(); } }}
                  onClick={(e) => { e.stopPropagation(); }}
                  placeholder="Add item..."
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                  className="px-3 py-1.5 bg-amber-400 text-white rounded-lg text-sm font-bold"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text / edit rendering for non-list memories */}
        {memory.type !== "list" && isEditing && (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            autoFocus
          />
        )}
        {memory.type !== "list" && !isEditing && (
          <p className="text-sm font-medium text-gray-900 break-words">
            {editText}
          </p>
        )}

        {/* Saved indicator */}
        {justSaved && (
          <p className="text-[10px] text-green-500 mt-1">
            Saved ✓
          </p>
        )}

        {/* Spotify helper */}
        {memory.spotifyUrl && (
          <p className="text-[10px] text-gray-400 mt-2">
            Tap artwork to open
          </p>
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
          className="text-red-500 text-xs mt-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
