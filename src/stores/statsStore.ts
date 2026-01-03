import { create } from 'zustand';
import { statsApi } from '../lib/api';

interface StatsState {
  activityData: [string, number][];
  categoryDistribution: [string, number][];
  loading: boolean;
  error: string | null;

  // Actions
  fetchActivityStats: (days?: number) => Promise<void>;
  fetchCategoryDistribution: () => Promise<void>;
  fetchAllStats: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  activityData: [],
  categoryDistribution: [],
  loading: false,
  error: null,

  fetchActivityStats: async (days?: number) => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.getActivity(days);
      set({ activityData: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchCategoryDistribution: async () => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.getCategoryDistribution();
      set({ categoryDistribution: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchAllStats: async () => {
    set({ loading: true, error: null });
    try {
      const [activity, distribution] = await Promise.all([
        statsApi.getActivity(365),
        statsApi.getCategoryDistribution(),
      ]);
      set({
        activityData: activity,
        categoryDistribution: distribution,
        loading: false,
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
