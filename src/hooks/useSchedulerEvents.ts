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
        toast.info('Running startup scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<SchedulerEventPayloads['scheduler:startup-scan-complete']>(
      'scheduler:startup-scan-complete',
      (event) => {
        const count = event.payload;
        if (count > 0) {
          toast.success(`Startup scan complete, found ${count} project(s) with changes`);
        } else {
          toast.info('Startup scan complete, no new changes');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // Listen for scheduled scan events
    listen<SchedulerEventPayloads['scheduler:scan-started']>(
      'scheduler:scan-started',
      () => {
        toast.info('Running scheduled scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<SchedulerEventPayloads['scheduler:scan-complete']>(
      'scheduler:scan-complete',
      (event) => {
        const inboxItemsCreated = event.payload;
        if (inboxItemsCreated > 0) {
          toast.success(`Scan complete, created ${inboxItemsCreated} inbox item(s)`);
        } else {
          toast.info('Scan complete, no new items');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [toast]);
}
