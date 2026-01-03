import { create } from 'zustand';
import { dailyLogApi, scannerApi } from '../lib/api';
import type { DailyLog, Project } from '../lib/types';

interface DailyLogState {
  logs: DailyLog[];
  loading: boolean;
  scanning: boolean;
  error: string | null;

  // Actions
  fetchLogs: (projectId?: string, limit?: number) => Promise<void>;
  createLog: (
    projectId: string,
    date: string,
    summary: string,
    category: string
  ) => Promise<DailyLog | null>;
  scanProject: (project: Project) => Promise<{ additions: number; deletions: number } | null>;
}

export const useDailyLogStore = create<DailyLogState>((set) => ({
  logs: [],
  loading: false,
  scanning: false,
  error: null,

  fetchLogs: async (projectId?: string, limit?: number) => {
    set({ loading: true, error: null });
    try {
      const logs = await dailyLogApi.getAll(projectId, limit);
      set({ logs, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createLog: async (
    projectId: string,
    date: string,
    summary: string,
    category: string
  ) => {
    try {
      const log = await dailyLogApi.create(projectId, date, summary, category);
      set((state) => ({
        logs: [log, ...state.logs],
      }));
      return log;
    } catch (error) {
      set({ error: String(error) });
      return null;
    }
  },

  scanProject: async (project: Project) => {
    set({ scanning: true, error: null });
    try {
      const isRepo = await scannerApi.isGitRepo(project.path);
      if (!isRepo) {
        set({ scanning: false });
        return null;
      }

      const result = await scannerApi.scanToday(project.path);
      set({ scanning: false });
      return {
        additions: result.total_additions,
        deletions: result.total_deletions,
      };
    } catch (error) {
      set({ error: String(error), scanning: false });
      return null;
    }
  },
}));
