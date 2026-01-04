import { useEffect, useCallback } from 'react';
import { useInboxStore } from '../stores/inboxStore';
import { useTodoStore } from '../stores/todoStore';
import { useStatsStore } from '../stores/statsStore';
import { useProjectStore } from '../stores/projectStore';
import { useDailyLogStore } from '../stores/dailyLogStore';

/**
 * Hook to sync stores when project selection changes.
 * This ensures all stores refetch their data when the user
 * switches between projects, so filtered views show correct data.
 */
export function useStoreSync() {
  const { selectedProjectId } = useProjectStore();
  const { fetchItems } = useInboxStore();
  const { fetchTodos } = useTodoStore();
  const { fetchAllStats } = useStatsStore();
  const { fetchLogs } = useDailyLogStore();

  const syncStores = useCallback(() => {
    // Refetch all data - filtering happens at component level with useMemo
    fetchItems();
    fetchTodos();
    fetchAllStats();
    fetchLogs();
  }, [fetchItems, fetchTodos, fetchAllStats, fetchLogs]);

  // Sync all stores when project selection changes
  useEffect(() => {
    syncStores();
  }, [selectedProjectId, syncStores]);

  return { syncStores };
}
