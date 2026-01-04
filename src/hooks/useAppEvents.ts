import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '../components/Toast';
import { useInboxStore } from '../stores/inboxStore';
import { useTodoStore } from '../stores/todoStore';
import { useProjectStore } from '../stores/projectStore';
import { useDailyLogStore } from '../stores/dailyLogStore';
import { useStatsStore } from '../stores/statsStore';

/**
 * Event types emitted by the backend
 */
interface AppEventPayloads {
  // Scheduler events
  'scheduler:startup-scan-started': null;
  'scheduler:startup-scan-complete': number;
  'scheduler:scan-started': null;
  'scheduler:scan-complete': number;

  // Data change events for store sync
  'data:inbox-updated': null;
  'data:todo-updated': null;
  'data:project-updated': null;
  'data:daily-log-updated': null;
  'data:stats-updated': null;
}

/**
 * Unified hook for listening to all app events and triggering store refreshes.
 * This hook consolidates event handling and ensures stores stay in sync with backend data.
 */
export function useAppEvents() {
  const toast = useToast();

  // Get store refresh functions
  const { fetchItems: fetchInboxItems } = useInboxStore();
  const { fetchTodos } = useTodoStore();
  const { fetchProjects } = useProjectStore();
  const { fetchLogs } = useDailyLogStore();
  const { fetchAllStats } = useStatsStore();

  // Memoized refresh handlers
  const handleInboxUpdate = useCallback(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  const handleTodoUpdate = useCallback(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleProjectUpdate = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDailyLogUpdate = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleStatsUpdate = useCallback(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // === Scheduler Events (with toast notifications) ===

    listen<AppEventPayloads['scheduler:startup-scan-started']>(
      'scheduler:startup-scan-started',
      () => {
        toast.info('Running startup scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:startup-scan-complete']>(
      'scheduler:startup-scan-complete',
      (event) => {
        const count = event.payload;
        if (count > 0) {
          toast.success(`Startup scan complete, found ${count} project(s) with changes`);
          // Refresh relevant stores after scan
          handleInboxUpdate();
          handleProjectUpdate();
        } else {
          toast.info('Startup scan complete, no new changes');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:scan-started']>(
      'scheduler:scan-started',
      () => {
        toast.info('Running scheduled scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:scan-complete']>(
      'scheduler:scan-complete',
      (event) => {
        const inboxItemsCreated = event.payload;
        if (inboxItemsCreated > 0) {
          toast.success(`Scan complete, created ${inboxItemsCreated} inbox item(s)`);
          // Refresh inbox after new items created
          handleInboxUpdate();
        } else {
          toast.info('Scan complete, no new items');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // === Data Change Events (silent store refreshes) ===

    listen<AppEventPayloads['data:inbox-updated']>(
      'data:inbox-updated',
      () => {
        handleInboxUpdate();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['data:todo-updated']>(
      'data:todo-updated',
      () => {
        handleTodoUpdate();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['data:project-updated']>(
      'data:project-updated',
      () => {
        handleProjectUpdate();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['data:daily-log-updated']>(
      'data:daily-log-updated',
      () => {
        handleDailyLogUpdate();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['data:stats-updated']>(
      'data:stats-updated',
      () => {
        handleStatsUpdate();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // Cleanup all listeners on unmount
    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [
    toast,
    handleInboxUpdate,
    handleTodoUpdate,
    handleProjectUpdate,
    handleDailyLogUpdate,
    handleStatsUpdate,
  ]);
}
