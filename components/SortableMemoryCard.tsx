"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MemoryCard from "./MemoryCard";

type Props = {
  memory: any;
  showDragHandle: boolean;
  onDelete: (id: string) => void;
  onToggleCheck?: (memoryId: string, index: number, currentChecked: number[]) => void;
  onAddListItem?: (memoryId: string, item: string) => void;
  onRemoveListItems?: (memoryId: string, indicesToRemove: number[]) => void;
  onPin: (id: string, pinned: boolean) => void;
};

export default function SortableMemoryCard({ memory, showDragHandle, onPin, ...props }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: memory.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      <MemoryCard
        {...props}
        memory={memory}
        onPin={onPin}
        dragHandleProps={showDragHandle ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}
