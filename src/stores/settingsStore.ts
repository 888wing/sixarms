import { create } from 'zustand';
import { settingsApi, grokApi } from '../lib/api';
import type { UserSettings, NotificationSettings } from '../lib/types';

interface SettingsState {
  settings: UserSettings;
  hasApiKey: boolean;
  loading: boolean;
  error: string | null;
  saved: boolean;

  // Actions
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  setApiKey: (key: string) => Promise<boolean>;
  checkApiKey: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setSaved: (saved: boolean) => void;
}

const defaultSettings: UserSettings = {
  notifications: {
    daily_summary: true,
    todo_reminder: true,
    stale_project: false,
  },
  theme: 'dark',
  language: 'zh-HK',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  hasApiKey: false,
  loading: false,
  error: null,
  saved: false,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await settingsApi.get();
      set({ settings, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  saveSettings: async (settings: UserSettings) => {
    set({ loading: true, error: null });
    try {
      await settingsApi.save(settings);
      set({ settings, loading: false, saved: true });
      setTimeout(() => set({ saved: false }), 2000);
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateNotifications: (notifications: Partial<NotificationSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        notifications: {
          ...state.settings.notifications,
          ...notifications,
        },
      },
    }));
  },

  setApiKey: async (key: string) => {
    set({ loading: true, error: null });
    try {
      await grokApi.setApiKey(key);
      set({ hasApiKey: true, loading: false });
      return true;
    } catch (error) {
      set({ error: String(error), loading: false });
      return false;
    }
  },

  checkApiKey: async () => {
    try {
      const hasKey = await grokApi.hasApiKey();
      set({ hasApiKey: hasKey });
    } catch (error) {
      set({ hasApiKey: false });
    }
  },

  deleteApiKey: async () => {
    try {
      await grokApi.deleteApiKey();
      set({ hasApiKey: false });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setSaved: (saved: boolean) => set({ saved }),
}));
