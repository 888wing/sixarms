import { create } from 'zustand';
import { todoApi } from '../lib/api';
import type { Todo, TodoStatus, TodoColumn } from '../lib/types';

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;

  // Computed
  pendingTodos: () => Todo[];
  completedTodos: () => Todo[];
  todayTodos: () => Todo[];

  // Actions
  fetchTodos: (status?: TodoStatus) => Promise<void>;
  createTodo: (
    title: string,
    projectId?: string,
    priority?: string,
    dueDate?: string
  ) => Promise<Todo | null>;
  updateTodoStatus: (id: string, status: TodoStatus) => Promise<void>;
  moveTodo: (id: string, column: TodoColumn, position: number) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  pendingTodos: () =>
    get().todos.filter((t) => t.status === 'pending' || t.status === 'in_progress'),

  completedTodos: () =>
    get().todos.filter((t) => t.status === 'completed'),

  todayTodos: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().todos.filter((t) => {
      // Show pending todos with today's due date or no due date
      if (t.status === 'completed') {
        return t.completed_at?.startsWith(today);
      }
      return t.due_date === today || !t.due_date;
    });
  },

  fetchTodos: async (status?: TodoStatus) => {
    set({ loading: true, error: null });
    try {
      const todos = await todoApi.getAll(status);
      set({ todos, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createTodo: async (
    title: string,
    projectId?: string,
    priority?: string,
    dueDate?: string
  ) => {
    try {
      const todo = await todoApi.create(title, projectId, priority, dueDate);
      set((state) => ({
        todos: [todo, ...state.todos],
      }));
      return todo;
    } catch (error) {
      set({ error: String(error) });
      return null;
    }
  },

  updateTodoStatus: async (id: string, status: TodoStatus) => {
    try {
      await todoApi.updateStatus(id, status);
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                completed_at: status === 'completed' ? new Date().toISOString() : t.completed_at,
              }
            : t
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  moveTodo: async (id: string, column: TodoColumn, position: number) => {
    try {
      await todoApi.move(id, column, position);
      // Optimistic update
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, column, position } : t
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteTodo: async (id: string) => {
    try {
      await todoApi.delete(id);
      set((state) => ({
        todos: state.todos.filter((t) => t.id !== id),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
