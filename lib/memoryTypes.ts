// lib/memoryTypes.ts
// This file is required by MemoryCard.tsx
// Place it at: lib/memoryTypes.ts

export const MEMORY_TYPE_META = {
  note: {
    label: "Note",
    icon: "📝",
    color: "bg-gray-100 text-gray-700",
  },
  list: {
    label: "List",
    icon: "✅",
    color: "bg-green-100 text-green-700",
  },
  vibe: {
    label: "Vibe",
    icon: "🎵",
    color: "bg-purple-100 text-purple-700",
  },
  snapshot: {
    label: "Pic",
    icon: "📸",
    color: "bg-pink-100 text-pink-700",
  },
  moment: {
    label: "Pic",
    icon: "📸",
    color: "bg-pink-100 text-pink-700",
  },
  collection: {
    label: "Collection",
    icon: "🗂️",
    color: "bg-blue-100 text-blue-700",
  },
  playlist: {
    label: "Playlist",
    icon: "🎶",
    color: "bg-amber-100 text-amber-700",
  },
  link: {
    label: "Link",
    icon: "🔗",
    color: "bg-sky-100 text-sky-700",
  },
} as const;

export type MemoryType = keyof typeof MEMORY_TYPE_META;
