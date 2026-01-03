import { create } from 'zustand';
import { settingsApi, grokApi, schedulerApi } from '../lib/api';
import type { UserSettings, NotificationSettings, ScanSettings, SchedulerStatus } from '../lib/types';

interface SettingsState {
  settings: UserSettings;
  hasApiKey: boolean;
  schedulerStatus: SchedulerStatus | null;
  loading: boolean;
  error: string | null;
  saved: boolean;

  // Actions
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  updateScan: (scan: Partial<ScanSettings>) => void;
  setApiKey: (key: string) => Promise<boolean>;
  checkApiKey: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setSaved: (saved: boolean) => void;

  // Scheduler actions
  fetchSchedulerStatus: () => Promise<void>;
  startScheduler: () => Promise<void>;
  stopScheduler: () => Promise<void>;
  triggerManualScan: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  notifications: {
    daily_summary: true,
    todo_reminder: true,
    stale_project: false,
  },
  scan: {
    enabled: true,
    interval_minutes: 30,
    scan_on_startup: true,
    auto_classify: true,
    auto_summarize: true,
  },
  theme: 'dark',
  language: 'zh-HK',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  hasApiKey: false,
  schedulerStatus: null,
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

  updateScan: (scan: Partial<ScanSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        scan: {
          ...state.settings.scan,
          ...scan,
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

  // Scheduler actions
  fetchSchedulerStatus: async () => {
    try {
      const status = await schedulerApi.getStatus();
      set({ schedulerStatus: status });
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error);
    }
  },

  startScheduler: async () => {
    try {
      const { settings } = get();
      await schedulerApi.start(settings.scan);
      await get().fetchSchedulerStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  stopScheduler: async () => {
    try {
      await schedulerApi.stop();
      await get().fetchSchedulerStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  triggerManualScan: async () => {
    set({ loading: true });
    try {
      await schedulerApi.triggerManualScan();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
