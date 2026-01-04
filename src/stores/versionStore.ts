import { create } from 'zustand';
import type { GitTag, Milestone, MilestoneStatus } from '../lib/types';
import { scannerApi } from '../lib/api';

interface VersionState {
  gitTags: GitTag[];
  milestones: Milestone[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchGitTags: (repoPath: string) => Promise<void>;
  setMilestones: (milestones: Milestone[]) => void;
  addMilestone: (milestone: Omit<Milestone, 'id' | 'created_at'>) => void;
  updateMilestoneStatus: (id: string, status: MilestoneStatus) => void;
  deleteMilestone: (id: string) => void;
  linkTagToMilestone: (milestoneId: string, tagName: string) => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  gitTags: [],
  milestones: [],
  loading: false,
  error: null,

  fetchGitTags: async (repoPath: string) => {
    set({ loading: true, error: null });
    try {
      const tags = await scannerApi.getGitTags(repoPath);
      set({ gitTags: tags, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setMilestones: (milestones) => {
    set({ milestones });
  },

  addMilestone: (milestoneData) => {
    const milestone: Milestone = {
      ...milestoneData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      milestones: [milestone, ...state.milestones],
    }));
  },

  updateMilestoneStatus: (id, status) => {
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              completed_at: status === 'completed' ? new Date().toISOString() : undefined,
            }
          : m
      ),
    }));
  },

  deleteMilestone: (id) => {
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    }));
  },

  linkTagToMilestone: (milestoneId, tagName) => {
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === milestoneId ? { ...m, git_tag: tagName } : m
      ),
    }));
  },
}));
