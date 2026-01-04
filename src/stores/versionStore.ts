import { create } from 'zustand';
import type { GitTag, Milestone, MilestoneStatus, MilestoneSource, Project, TagSyncResult } from '../lib/types';
import { milestoneApi, scannerApi } from '../lib/api';

type GitTagWithProject = GitTag & {
  project_id: string;
  project_name: string;
};

type CreateMilestoneInput = {
  project_id: string;
  title: string;
  description?: string;
  version?: string;
  git_tag?: string;
  status?: MilestoneStatus;
  source?: MilestoneSource;
  target_date?: string;
};

interface VersionState {
  gitTags: GitTagWithProject[];
  milestones: Milestone[];
  tagsLoading: boolean;
  milestonesLoading: boolean;
  syncing: boolean;
  lastSyncTime: string | null;
  error: string | null;

  // Actions
  fetchGitTags: (projects: Project[], selectedProjectId: string | null) => Promise<void>;
  fetchMilestones: (projectId?: string | null) => Promise<void>;
  syncGitTags: (projects: Project[], autoCreateMilestones: boolean) => Promise<TagSyncResult[]>;
  addMilestone: (milestone: CreateMilestoneInput) => Promise<void>;
  updateMilestoneStatus: (id: string, status: MilestoneStatus) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  gitTags: [],
  milestones: [],
  tagsLoading: false,
  milestonesLoading: false,
  syncing: false,
  lastSyncTime: null,
  error: null,

  fetchGitTags: async (projects, selectedProjectId) => {
    set({ tagsLoading: true, error: null });
    if (projects.length === 0) {
      set({ gitTags: [], tagsLoading: false });
      return;
    }

    const selectedProject = selectedProjectId
      ? projects.find((project) => project.id === selectedProjectId)
      : null;
    const targetProjects = selectedProject ? [selectedProject] : projects;

    try {
      const results = await Promise.all(
        targetProjects.map(async (project) => {
          try {
            const tags = await scannerApi.getGitTags(project.path);
            return { project, tags };
          } catch (error) {
            return { project, tags: [], error: String(error) };
          }
        })
      );

      const errors = results
        .filter((result) => result.error)
        .map((result) => `${result.project.name}: ${result.error}`);

      const tags = results.flatMap((result) =>
        result.tags.map((tag) => ({
          ...tag,
          project_id: result.project.id,
          project_name: result.project.name,
        }))
      );

      set({
        gitTags: tags,
        tagsLoading: false,
        lastSyncTime: new Date().toISOString(),
        error: errors[0] ?? null,
      });
    } catch (error) {
      set({ error: String(error), tagsLoading: false });
    }
  },

  fetchMilestones: async (projectId) => {
    set({ milestonesLoading: true, error: null });
    try {
      const milestones = await milestoneApi.getAll(projectId ?? undefined);
      set({ milestones, milestonesLoading: false });
    } catch (error) {
      set({ error: String(error), milestonesLoading: false });
    }
  },

  syncGitTags: async (projects, autoCreateMilestones) => {
    set({ syncing: true, error: null });
    const results: TagSyncResult[] = [];

    try {
      for (const project of projects) {
        try {
          const result = await scannerApi.syncGitTags(
            project.id,
            project.path,
            autoCreateMilestones
          );
          results.push(result);
        } catch (error) {
          console.error(`Failed to sync tags for ${project.name}:`, error);
        }
      }

      set({
        syncing: false,
        lastSyncTime: new Date().toISOString(),
      });

      // Refresh milestones if any were created
      const totalNewMilestones = results.reduce((sum, r) => sum + r.new_tags.length, 0);
      if (totalNewMilestones > 0 && autoCreateMilestones) {
        get().fetchMilestones();
      }

      return results;
    } catch (error) {
      set({ error: String(error), syncing: false });
      return results;
    }
  },

  addMilestone: async (milestoneData) => {
    try {
      const milestone = await milestoneApi.create(
        milestoneData.project_id,
        milestoneData.title,
        milestoneData.description,
        milestoneData.version,
        milestoneData.git_tag,
        milestoneData.status,
        milestoneData.source,
        milestoneData.target_date
      );
      set((state) => ({
        milestones: [milestone, ...state.milestones],
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateMilestoneStatus: async (id, status) => {
    try {
      await milestoneApi.updateStatus(id, status);
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
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteMilestone: async (id) => {
    try {
      await milestoneApi.delete(id);
      set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== id),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
