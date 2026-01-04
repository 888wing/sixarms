// src/components/kanban/KanbanBoard.tsx
import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Todo } from '../../lib/types';

interface Props {
  todos: Todo[];
  onMoveTodo: (id: string, column: string, position: number) => void;
  onDeleteTodo?: (id: string) => void;
}

const columns = [
  { id: 'backlog', title: 'Backlog', icon: '📥' },
  { id: 'in_progress', title: 'In Progress', icon: '🔄' },
  { id: 'done', title: 'Done', icon: '✅' },
];

export function KanbanBoard({ todos, onMoveTodo, onDeleteTodo }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const todosByColumn = useMemo(() => {
    const grouped: Record<string, Todo[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    todos.forEach((todo) => {
      const col = todo.column || 'backlog';
      if (grouped[col]) {
        grouped[col].push(todo);
      }
    });
    // Sort by position
    Object.keys(grouped).forEach((col) => {
      grouped[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });
    return grouped;
  }, [todos]);

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const todoId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumn = columns.find((c) => c.id === overId)?.id;
    if (!targetColumn) {
      // Dropped on another card - find its column
      const overTodo = todos.find((t) => t.id === overId);
      targetColumn = overTodo?.column || 'backlog';
    }

    // Calculate position
    const columnTodos = todosByColumn[targetColumn] || [];
    const overIndex = columnTodos.findIndex((t) => t.id === overId);
    const position = overIndex >= 0 ? overIndex : columnTodos.length;

    onMoveTodo(todoId, targetColumn, position);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            todos={todosByColumn[col.id] || []}
            onDeleteTodo={onDeleteTodo}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTodo && <KanbanCard todo={activeTodo} />}
      </DragOverlay>
    </DndContext>
  );
}
