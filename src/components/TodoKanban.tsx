import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import type { Todo, TodoStatus } from "../lib/types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

interface TodoKanbanProps {
  todos: Todo[];
  onStatusChange: (id: string, status: TodoStatus) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface Column {
  id: TodoStatus;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: "pending", title: "PENDING", color: "text-accent-amber", bgColor: "bg-accent-amber/10" },
  { id: "in_progress", title: "IN PROGRESS", color: "text-accent-cyan", bgColor: "bg-accent-cyan/10" },
  { id: "completed", title: "COMPLETED", color: "text-accent-green", bgColor: "bg-accent-green/10" },
  { id: "cancelled", title: "CANCELLED", color: "text-text-muted", bgColor: "bg-bg-elevated" },
];

export function TodoKanban({ todos, onStatusChange, onDelete }: TodoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const todosByStatus = useMemo(() => {
    const grouped: Record<TodoStatus, Todo[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    todos.forEach((todo) => {
      grouped[todo.status].push(todo);
    });

    return grouped;
  }, [todos]);

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by DndContext
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columns.find((col) => col.id === overId);
    if (targetColumn) {
      const activeTodo = todos.find((t) => t.id === activeId);
      if (activeTodo && activeTodo.status !== targetColumn.id) {
        await onStatusChange(activeId, targetColumn.id);
      }
      return;
    }

    // Check if dropped on another todo (get its column)
    const overTodo = todos.find((t) => t.id === overId);
    if (overTodo) {
      const activeTodo = todos.find((t) => t.id === activeId);
      if (activeTodo && activeTodo.status !== overTodo.status) {
        await onStatusChange(activeId, overTodo.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full"
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            bgColor={column.bgColor}
            count={todosByStatus[column.id].length}
          >
            <SortableContext
              items={todosByStatus[column.id].map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {todosByStatus[column.id].map((todo) => (
                <KanbanCard
                  key={todo.id}
                  todo={todo}
                  onDelete={onDelete}
                />
              ))}
            </SortableContext>
          </KanbanColumn>
        ))}
      </motion.div>

      <DragOverlay>
        {activeTodo ? (
          <KanbanCard todo={activeTodo} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
