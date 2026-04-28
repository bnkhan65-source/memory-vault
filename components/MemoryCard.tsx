"use client";

import { useRef, useState } from "react";
import { MEMORY_TYPE_META } from "@/lib/memoryTypes";

type Memory = {
  id: string;
  text?: string;
  imageUrl?: string;
  spotifyUrl?: string | null;
  category?: string;
  type?: keyof typeof MEMORY_TYPE_META;
  checked?: number[];
};

type Props = {
  memory: Memory;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
  onToggleCheck?: (
    memoryId: string,
    index: number,
    currentChecked: number[]
  ) => void;
};

export default function MemoryCard({
  memory,
  onDelete,
  onUpdate,
  onToggleCheck,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text || "");
  const [justSaved, setJustSaved] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

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

const [checkedItems, setCheckedItems] = useState<number[]>(
  memory.checked || []
);

const toggleCheck = (index: number) => {
  const updatedChecked = checkedItems.includes(index)
    ? checkedItems.filter((i) => i !== index)
    : [...checkedItems, index];

  setCheckedItems(updatedChecked);

  if (onToggleCheck) {
    onToggleCheck(
      memory.id,
      index,
      checkedItems
    );
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
        if (memory.type === "list") return;

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
        <img
          src={memory.imageUrl}
          alt="Memory"
          onClick={(e) => {
            e.stopPropagation();

            if (memory.spotifyUrl) {
              window.open(memory.spotifyUrl, "_blank");
            }
          }}
          className="w-20 h-20 rounded-lg object-cover shrink-0"
        />
      )}

      {/* Right-side content */}
      <div className="flex-1 min-w-0">
        {/* TOP ROW → Primary + Secondary */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* PRIMARY → Category */}
          {memory.category && (
            <span className="text-xs px-3 py-1 bg-gray-800 text-white rounded-full font-medium">
              {memory.category}
            </span>
          )}

          {/* SECONDARY → Type */}
          {memory.type && (
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${meta.color}`}
            >
              {meta.icon} {meta.label}
            </span>
          )}
        </div>

        {/* Main content */}
       {memory.type === "list" ? (
  <div className="space-y-2">
    {(memory.text || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-sm"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCheck(index);
            }}
            className="text-gray-500"
          >
            {checkedItems.includes(index) ? "☑" : "☐"}
          </button>

          <span
            className={
              checkedItems.includes(index)
                ? "line-through text-gray-400"
                : ""
            }
          >
            {item}
          </span>
        </div>
      ))}
  </div>
) : isEditing ? (
  <textarea
    value={editText}
    onChange={(e) => setEditText(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    className="w-full border rounded-lg p-2 text-sm"
    rows={3}
    autoFocus
  />
) : (
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

        {/* Spotify helper text */}
        {memory.spotifyUrl && (
          <p className="text-[10px] text-gray-400 mt-2">
            Tap artwork to open
          </p>
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