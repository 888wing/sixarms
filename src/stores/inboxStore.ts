import { create } from 'zustand';
import { inboxApi } from '../lib/api';
import type { InboxItem, InboxStatus } from '../lib/types';

interface InboxState {
  items: InboxItem[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'pending' | 'answered';

  // Computed
  pendingCount: () => number;
  answeredCount: () => number;
  filteredItems: () => InboxItem[];

  // Actions
  fetchItems: (status?: InboxStatus) => Promise<void>;
  answerItem: (id: string, answer: string) => Promise<void>;
  createItem: (
    itemType: string,
    question: string,
    projectId?: string,
    context?: string
  ) => Promise<InboxItem | null>;
  setFilter: (filter: 'all' | 'pending' | 'answered') => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filter: 'all',

  pendingCount: () => get().items.filter((i) => i.status === 'pending').length,
  answeredCount: () => get().items.filter((i) => i.status === 'answered').length,

  filteredItems: () => {
    const { items, filter } = get();
    if (filter === 'pending') return items.filter((i) => i.status === 'pending');
    if (filter === 'answered') return items.filter((i) => i.status === 'answered');
    return items;
  },

  fetchItems: async (status?: InboxStatus) => {
    set({ loading: true, error: null });
    try {
      const items = await inboxApi.getAll(status);
      set({ items, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  answerItem: async (id: string, answer: string) => {
    try {
      await inboxApi.answer(id, answer);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'answered' as const,
                answer,
                answered_at: new Date().toISOString(),
              }
            : item
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  createItem: async (
    itemType: string,
    question: string,
    projectId?: string,
    context?: string
  ) => {
    try {
      const item = await inboxApi.create(itemType, question, projectId, context);
      set((state) => ({
        items: [item, ...state.items],
      }));
      return item;
    } catch (error) {
      set({ error: String(error) });
      return null;
    }
  },

  setFilter: (filter: 'all' | 'pending' | 'answered') => {
    set({ filter });
  },
}));
