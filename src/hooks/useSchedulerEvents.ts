import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '../components/Toast';

interface SchedulerEventPayloads {
  'scheduler:startup-scan-started': null;
  'scheduler:startup-scan-complete': number;
  'scheduler:scan-started': null;
  'scheduler:scan-complete': number;
}

/**
 * Hook to listen for scheduler events and show toast notifications
 */
export function useSchedulerEvents() {
  const toast = useToast();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Listen for startup scan events
    listen<SchedulerEventPayloads['scheduler:startup-scan-started']>(
      'scheduler:startup-scan-started',
      () => {
        toast.info('正在執行啟動掃描...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<SchedulerEventPayloads['scheduler:startup-scan-complete']>(
      'scheduler:startup-scan-complete',
      (event) => {
        const count = event.payload;
        if (count > 0) {
          toast.success(`啟動掃描完成，發現 ${count} 個專案有改動`);
        } else {
          toast.info('啟動掃描完成，無新改動');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // Listen for scheduled scan events
    listen<SchedulerEventPayloads['scheduler:scan-started']>(
      'scheduler:scan-started',
      () => {
        toast.info('正在執行定時掃描...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<SchedulerEventPayloads['scheduler:scan-complete']>(
      'scheduler:scan-complete',
      (event) => {
        const inboxItemsCreated = event.payload;
        if (inboxItemsCreated > 0) {
          toast.success(`掃描完成，建立 ${inboxItemsCreated} 個收件箱項目`);
        } else {
          toast.info('掃描完成，無新項目');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [toast]);
}
