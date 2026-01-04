import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Trash2, Calendar, AlertCircle } from "lucide-react";
import type { Todo } from "../lib/types";

interface KanbanCardProps {
  todo: Todo;
  isDragging?: boolean;
  onDelete?: (id: string) => Promise<void>;
}

const priorityConfig = {
  low: { color: "text-text-muted", bg: "bg-bg-elevated", label: "Low" },
  medium: { color: "text-accent-amber", bg: "bg-accent-amber/10", label: "Med" },
  high: { color: "text-accent-rose", bg: "bg-accent-rose/10", label: "High" },
  urgent: { color: "text-accent-rose", bg: "bg-accent-rose/20", label: "Urgent" },
};

export function KanbanCard({ todo, isDragging, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[todo.priority];

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      await onDelete(todo.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        group relative p-3 rounded-lg border cursor-grab active:cursor-grabbing
        ${isDragging || isSortableDragging
          ? "bg-bg-primary border-accent-cyan shadow-lg shadow-accent-cyan/20 opacity-90"
          : "bg-bg-primary border-border-subtle hover:border-border-active"
        }
        transition-colors duration-150
      `}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical size={14} className="text-text-muted" />
      </div>

      {/* Content */}
      <div className="pl-3">
        {/* Title */}
        <p className={`text-sm font-medium mb-2 ${
          todo.status === "completed" ? "text-text-muted line-through" : "text-text-primary"
        }`}>
          {todo.title}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Badge */}
          <span className={`text-xs px-2 py-0.5 rounded ${priority.bg} ${priority.color} font-mono`}>
            {priority.label}
          </span>

          {/* Due Date */}
          {todo.due_date && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Calendar size={10} />
              {new Date(todo.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}

          {/* Urgent Indicator */}
          {todo.priority === "urgent" && (
            <AlertCircle size={12} className="text-accent-rose animate-pulse" />
          )}
        </div>
      </div>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-rose/20 text-text-muted hover:text-accent-rose transition-all"
        >
          <Trash2 size={12} />
        </button>
      )}
    </motion.div>
  );
}
