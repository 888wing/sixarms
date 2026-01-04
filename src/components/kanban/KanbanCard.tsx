// src/components/kanban/KanbanCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Todo } from '../../lib/types';

interface Props {
  todo: Todo;
  onDelete?: (id: string) => void;
}

export function KanbanCard({ todo, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors: Record<string, string> = {
    urgent: 'border-l-accent-rose',
    high: 'border-l-accent-amber',
    medium: 'border-l-accent-cyan',
    low: 'border-l-text-muted',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-bg-primary border border-border-subtle rounded cursor-grab hover:border-accent-cyan/50 transition-colors border-l-2 ${priorityColors[todo.priority] || 'border-l-text-muted'}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">{todo.title}</p>
          {todo.project_id && (
            <p className="text-xs text-text-muted mt-1 truncate">
              #{todo.project_id.slice(0, 8)}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className="p-1 text-text-muted hover:text-accent-rose transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
