"use client";

import { updateDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { MEMORY_TYPE_META } from "../lib/memoryTypes";
import { useState, useRef, useEffect } from "react";
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
//COMPONENT
export default function MemoryCard({
  memory, onDelete,}: {
  memory: Memory;
  onDelete: (id: string) => void;
}) {
  
  const meta = MEMORY_TYPE_META[memory.type || "note"];
  const [checkedItems, setCheckedItems] = useState<number[]>(
  memory.checked || []
  
);
const [isEditing, setIsEditing] = useState(false);
const [editText, setEditText] = useState(memory.text);
const cardRef = useRef<HTMLDivElement | null>(null);
const [justSaved, setJustSaved] = useState(false);
const [showSaved, setShowSaved] = useState(false);
const [isPulsing, setIsPulsing] = useState(false);
const [isPressed, setIsPressed] = useState(false);
const handleSaveEdit = async () => {
  if (!auth.currentUser) return;
  if (!editText.trim()) return; // ✅ prevent empty
  if (editText === memory.text) {
    setIsEditing(false);
    return;
  }


  await updateDoc(
    doc(db, "users", auth.currentUser.uid, "memories", memory.id),
    {
      text: editText,
    }
  );
  
  setIsEditing(false);
  setJustSaved(true);
  setTimeout(() => {
  setJustSaved(false);
  }, 1200);
  
  // ✅ pulse trigger
setIsPulsing(true);
setTimeout(() => {
  setIsPulsing(false);
}, 200);
};
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      cardRef.current &&
      !cardRef.current.contains(event.target as Node)
    ) {
      if (isEditing) {
        handleSaveEdit();
      }
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [isEditing, handleSaveEdit]);
  return (
    
    
    //MAIN WRAPPER//

<div
  ref={cardRef}
  onMouseDown={() => setIsPressed(true)}
  onMouseUp={() => setIsPressed(false)}
  onMouseLeave={() => setIsPressed(false)}
  onTouchStart={() => setIsPressed(true)}
  onTouchEnd={() => setIsPressed(false)}
  onClick={(e) => {
    if (memory.type === "list") return;

    if (isEditing) {
      handleSaveEdit();
      return;
    }

    setIsEditing(true);
  }}
  className={`relative bg-white p-4 rounded-xl shadow-sm flex gap-3 items-center transition-all duration-150 ease-out cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:bg-gray-50
    ${isPulsing ? "scale-[1.03] shadow-lg" : ""}
    ${isPressed ? "scale-[0.97]" : ""}
  `}
>

  {/* ✅ Category badge */}
  {memory.category && (
    <div className="absolute top-2 right-2">
      <span className="text-[10px] px-2 py-1 bg-gray-200 rounded-full text-gray-700">
        {memory.category}
      </span>
    </div>
  )}

 
    {/* Album Image */}
    {memory.imageUrl && (
      <img
        src={memory.imageUrl}
        onClick={(e) => {
          e.stopPropagation();
          if (memory.spotifyUrl) {
            window.open(memory.spotifyUrl, "_blank");
          }
        }}
        className="w-16 h-16 rounded object-cover"
      />
    )}

    {/* Content */}
    <div className="flex-1">
      <div className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${meta.color}`}>
        {meta.icon} {meta.label}
      </div>

  {/* ✅ LIST vs NORMAL TEXT */}
{memory.type === "list" ? (
  <div className="space-y-1">

    {memory.text.
    split("\n")
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map((item, i) => {
      const isChecked = checkedItems.includes(i);

      return (
        <div
          key={i}
          onClick={async (e) => {
            e.stopPropagation();

            const newChecked = isChecked
              ? checkedItems.filter((idx) => idx !== i)
              : [...checkedItems, i];

            setCheckedItems(newChecked);

            if (auth.currentUser) {
              await updateDoc(
                doc(db, "users", auth.currentUser.uid, "memories", memory.id),
                { checked: newChecked }
              );
            }
          }}
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          <input type="checkbox" checked={isChecked} readOnly />

          <span
            className={
              isChecked
                ? "line-through text-gray-400"
                : "text-gray-900"
            }
          >
           
          </span>
        </div>
      );
    })}
  </div>
) : isEditing ? (
  <>
    {(memory.type as any) === "list" ? (
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => handleSaveEdit()}
        autoFocus
        rows={4}
        placeholder="Type item and press Enter..."
        className="w-full text-sm border rounded p-2"
      />
    ) : (
      <input
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={() => handleSaveEdit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSaveEdit();
          }
        }}
        autoFocus
        className="w-full text-sm border rounded p-1"
      />
    )}
  </>
) : (
  <>
  <p className="text-sm font-medium text-gray-900">
    {editText}
  </p>

  {justSaved && (
  <p className="text-[10px] text-green-500 mt-1 opacity-100 transition-opacity duration-500">
    Saved ✓
  </p>
  
  )}
  
  </>
)}

      {/* Spotify hint */}
      {memory.spotifyUrl && (
        <p className="text-[10px] text-gray-400 mt-1">
          Tap artwork to open
        </p>
      )}

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {memory.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(memory.id);
        }}
        className="text-red-500 text-xs mt-2"
      >
        Delete
      </button>
    </div>
    
  </div>
);
}