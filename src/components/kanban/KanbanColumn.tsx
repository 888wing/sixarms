// src/components/kanban/KanbanColumn.tsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { Todo } from '../../lib/types';

interface Props {
  id: string;
  title: string;
  icon: string;
  todos: Todo[];
  onDeleteTodo?: (id: string) => void;
}

const columnColors: Record<string, string> = {
  backlog: 'text-text-muted',
  in_progress: 'text-accent-cyan',
  done: 'text-accent-green',
};

export function KanbanColumn({ id, title, icon, todos, onDeleteTodo }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[280px] max-w-[360px] flex flex-col">
      {/* Header */}
      <div className={`flex items-center gap-2 p-3 bg-bg-elevated rounded-t border border-border-subtle border-b-0 ${columnColors[id]}`}>
        <span>{icon}</span>
        <span className="font-display text-sm uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-xs bg-bg-secondary px-2 py-0.5 rounded">
          {todos.length}
        </span>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 bg-bg-secondary border border-border-subtle rounded-b overflow-auto transition-colors ${
          isOver ? 'bg-accent-cyan/5 border-accent-cyan/30' : ''
        }`}
      >
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {todos.map((todo) => (
              <KanbanCard key={todo.id} todo={todo} onDelete={onDeleteTodo} />
            ))}
            {todos.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">
                Drop tasks here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
