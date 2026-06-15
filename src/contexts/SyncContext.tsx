import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineDb, SyncQueueItem } from '../lib/db';
import { supabase } from '../lib/supabase';

interface SyncContextType {
  isOnline: boolean;
  queueCount: number;
  pendingItems: SyncQueueItem[];
  failedItems: SyncQueueItem[];
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  removeFromQueue: (id: number) => Promise<void>;
  performAction: <T>(
    table: string,
    action: 'insert' | 'update' | 'delete' | 'upsert',
    payload: any,
    apiCall: () => Promise<{ data: T | null; error: any }>
  ) => Promise<{ data: T | null; error: any }>;
  getCached: (table: string, id: string) => Promise<any | null>;
  setCache: (table: string, id: string, data: any) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueStatus = useCallback(async () => {
    try {
      const pending = await offlineDb.syncQueue.where('status').equals('pending').toArray();
      const failed = await offlineDb.syncQueue.where('status').equals('failed').toArray();
      
      setQueueCount(pending.length);
      setPendingItems(pending);
      setFailedItems(failed);
    } catch (err) {
      console.error('Error refreshing queue status:', err);
    }
  }, []);

  const getCached = async (collection: string, id: string) => {
    const item = await offlineDb.cache.get([collection, id]);
    return item ? item.data : null;
  };

  const setCache = async (collection: string, id: string, data: any) => {
    await offlineDb.cache.put({
      id,
      collection,
      data,
      updatedAt: Date.now()
    });
  };

  const performAction = useCallback(async <T,>(
    table: string,
    action: 'insert' | 'update' | 'delete' | 'upsert',
    payload: any,
    apiCall: () => Promise<{ data: T | null; error: any }>
  ) => {
    if (isOnline) {
      try {
        const result = await apiCall();
        if (!result.error) {
          return result;
        }
      } catch (err) {
        console.error('Online API Error, queueing...', err);
      }
    }

    await offlineDb.syncQueue.add({
      type: action as any,
      collection: table,
      payload,
      status: 'pending',
      timestamp: Date.now()
    });

    if (action === 'insert' || action === 'upsert' || action === 'update') {
      const id = payload.id || payload.student_id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await offlineDb.cache.put({
        id: id.toString(),
        collection: table,
        data: payload,
        updatedAt: Date.now()
      });
    } else if (action === 'delete') {
      const id = payload.id;
      if (id) {
        await offlineDb.cache.delete([table, id.toString()]);
      }
    }
    
    refreshQueueStatus();
    return { data: payload as T, error: null, queued: true } as any;
  }, [isOnline, refreshQueueStatus]);

  useEffect(() => {
    refreshQueueStatus();
    const interval = setInterval(refreshQueueStatus, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [refreshQueueStatus]);

  const removeFromQueue = async (id: number) => {
    await offlineDb.syncQueue.delete(id);
    refreshQueueStatus();
  };

  const preloadData = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Pre-cache primary entities
      console.log('Starting data pre-caching...');
      
      const tablesToPreload = [
        { name: 'students', limit: 2000 },
        { name: 'subjects', limit: 500 },
        { name: 'grades', limit: 5000 },
        { name: 'recommendations', limit: 1000 },
        { name: 'absences', limit: 1000 },
        { name: 'holidays', limit: 500 },
        { name: 'announcements', limit: 50 },
        { name: 'activity_logs', limit: 200, order: { col: 'created_at', asc: false } },
        { name: 'health_cards', limit: 2000 },
        { name: 'fee_payments', limit: 2000 }
      ];

      for (const table of tablesToPreload) {
        try {
          let query = supabase.from(table.name).select('*');
          if (table.order) {
            query = query.order(table.order.col, { ascending: table.order.asc });
          }
          if (table.limit) {
            query = query.limit(table.limit);
          }

          const { data, error } = await query;
          if (error) {
            console.warn(`Failed to preload table ${table.name}:`, error);
            continue;
          }

          if (data) {
            for (const item of data) {
              await offlineDb.cache.put({
                id: item.id.toString(),
                collection: table.name,
                data: item,
                updatedAt: Date.now()
              });
            }
            console.log(`Pre-cached ${data.length} records for ${table.name}`);
          }
        } catch (err) {
          console.warn(`Unexpected error preloading ${table.name}:`, err);
        }
      }

      // Special case: Today's attendance
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: attendance, error: attError } = await supabase
          .from('attendance')
          .select('*')
          .gte('recorded_at', today.toISOString());
        
        if (!attError && attendance) {
          for (const record of attendance) {
            await offlineDb.cache.put({
              id: record.id.toString(),
              collection: 'attendance',
              data: record,
              updatedAt: Date.now()
            });
          }
          console.log(`Pre-cached ${attendance.length} records for today's attendance`);
        }
      } catch (err) {
        console.warn('Attendance preload failed:', err);
      }

      console.log('Pre-caching complete.');
    } catch (err) {
      console.warn('Preload process failed:', err);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      preloadData();
    }
  }, [isOnline, preloadData]);

  // Global persistent background gateway worker loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const runWorker = async () => {
      const isAutoWorkerActive = localStorage.getItem('school_android_gateway_auto_worker_active') === 'true';
      if (!isAutoWorkerActive) return;

      try {
        const { runAndroidGatewayWorker } = await import('../lib/androidBridge');
        await runAndroidGatewayWorker(isOnline);
      } catch (err) {
        console.warn('Global Android gateway worker loop failed:', err);
      }
    };

    // Run once at start/change of status
    runWorker();

    // Constant 15s interval (even if page unmounts, Context stays alive)
    interval = setInterval(runWorker, 15000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOnline]);

  const cleanupExpiredCards = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cached = await offlineDb.cache.where('collection').equals('health_cards').toArray();
      const expired = cached.filter(item => item.data.expiry_date && item.data.expiry_date < today);

      if (expired.length === 0) return;

      console.log(`Cleaning up ${expired.length} expired health cards...`);

      for (const item of expired) {
        await performAction(
          'health_cards',
          'delete',
          { id: item.data.id },
          () => supabase.from('health_cards').delete().eq('id', item.data.id)
        );
      }
      refreshQueueStatus();
    } catch (err) {
      console.error('Expired health cards cleanup failed:', err);
    }
  }, [isOnline, refreshQueueStatus]);

  useEffect(() => {
    const lastCleanup = localStorage.getItem('last_health_card_cleanup');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastCleanup !== today) {
      cleanupExpiredCards();
      localStorage.setItem('last_health_card_cleanup', today);
    }
  }, [cleanupExpiredCards]);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const items = await offlineDb.syncQueue
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .toArray();

      if (items.length === 0) return;

      for (const item of items) {
        try {
          let error = null;
          if (item.type === 'insert') {
            const { error: e } = await supabase.from(item.collection).insert(item.payload);
            error = e;
          } else if (item.type === 'update') {
            const { error: e } = await supabase.from(item.collection).update(item.payload).eq('id', item.payload.id || item.payload.student_id);
            error = e;
          } else if (item.type === 'delete') {
            const { error: e } = await supabase.from(item.collection).delete().eq('id', item.payload.id);
            error = e;
          } else if (item.type === 'upsert') {
            const { error: e } = await supabase.from(item.collection).upsert(item.payload);
            error = e;
          }

          if (!error) {
            await offlineDb.syncQueue.delete(item.id!);
          } else {
            await offlineDb.syncQueue.update(item.id!, { 
              status: 'failed', 
              error: error.message || JSON.stringify(error) 
            });
          }
        } catch (e) {
          await offlineDb.syncQueue.update(item.id!, { 
            status: 'failed', 
            error: e instanceof Error ? e.message : 'Unknown error' 
          });
        }
      }
    } finally {
      setIsSyncing(false);
      refreshQueueStatus();
    }
  }, [isOnline, isSyncing, refreshQueueStatus]);

  useEffect(() => {
    if (isOnline && queueCount > 0 && !isSyncing) {
      const timer = setTimeout(() => syncNow(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queueCount, isSyncing, syncNow]);

  return (
    <SyncContext.Provider value={{ 
      isOnline, 
      queueCount, 
      pendingItems,
      failedItems, 
      isSyncing, 
      syncNow, 
      removeFromQueue,
      performAction,
      getCached,
      setCache
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
