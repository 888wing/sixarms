import { create } from 'zustand';
import { projectApi } from '../lib/api';
import type { Project, ProjectStatus } from '../lib/types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, path: string) => Promise<Project | null>;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  selectedProjectId: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await projectApi.getAll();
      set({ projects, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createProject: async (name: string, path: string) => {
    set({ loading: true, error: null });
    try {
      const project = await projectApi.create(name, path);
      set((state) => ({
        projects: [...state.projects, project],
        loading: false,
      }));
      return project;
    } catch (error) {
      set({ error: String(error), loading: false });
      return null;
    }
  },

  updateProjectStatus: async (id: string, status: ProjectStatus) => {
    try {
      await projectApi.updateStatus(id, status);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, status } : p
        ),
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  deleteProject: async (id: string) => {
    try {
      await projectApi.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProjectId:
          state.selectedProjectId === id ? null : state.selectedProjectId,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  selectProject: (id: string | null) => {
    set({ selectedProjectId: id });
  },
}));
