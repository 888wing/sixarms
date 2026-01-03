import { create } from 'zustand';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateState {
  checking: boolean;
  downloading: boolean;
  downloadProgress: number;
  update: Update | null;
  error: string | null;
  dismissed: boolean;

  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismiss: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  checking: false,
  downloading: false,
  downloadProgress: 0,
  update: null,
  error: null,
  dismissed: false,

  checkForUpdates: async () => {
    set({ checking: true, error: null, dismissed: false });
    try {
      const update = await check();
      set({ update, checking: false });
    } catch (error) {
      set({ error: String(error), checking: false });
    }
  },

  downloadAndInstall: async () => {
    const { update } = get();
    if (!update) return;

    set({ downloading: true, downloadProgress: 0, error: null });
    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.download((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          const progress = contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;
          set({ downloadProgress: progress });
        }
      });

      await update.install();
      await relaunch();
    } catch (error) {
      set({ error: String(error), downloading: false });
    }
  },

  dismiss: () => {
    set({ dismissed: true });
  },
}));
