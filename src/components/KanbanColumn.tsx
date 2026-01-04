import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { TodoStatus } from "../lib/types";

interface KanbanColumnProps {
  id: TodoStatus;
  title: string;
  color: string;
  bgColor: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({
  id,
  title,
  color,
  bgColor,
  count,
  children,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`
        flex flex-col h-full min-h-[400px] rounded-lg border
        ${isOver ? "border-accent-cyan bg-accent-cyan/5" : "border-border-subtle bg-bg-secondary/30"}
        transition-colors duration-200
      `}
    >
      {/* Column Header */}
      <div className={`p-3 ${bgColor} rounded-t-lg border-b border-border-subtle`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-display text-sm tracking-wider ${color}`}>
            {title}
          </h3>
          <span className={`font-mono text-xs ${color} bg-bg-primary/50 px-2 py-0.5 rounded`}>
            {count}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto space-y-2">
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-24 text-text-muted text-sm border border-dashed border-border-subtle rounded">
            Drop items here
          </div>
        )}
      </div>
    </motion.div>
  );
}
