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
      // Pre-cache students/teachers
      const { data: students } = await supabase.from('students').select('*').limit(1000);
      if (students) {
        for (const student of students) {
          await offlineDb.cache.put({
            id: student.id,
            collection: 'students',
            data: student,
            updatedAt: Date.now()
          });
        }
        console.log(`Pre-cached ${students.length} students/teachers`);
      }

      // Pre-cache health cards
      const { data: cards } = await supabase.from('health_cards').select('*').limit(1000);
      if (cards) {
        for (const card of cards) {
          await offlineDb.cache.put({
            id: card.id,
            collection: 'health_cards',
            data: card,
            updatedAt: Date.now()
          });
        }
      }

      // Pre-cache fee payments
      const { data: payments } = await supabase.from('fee_payments').select('*').limit(2000);
      if (payments) {
        for (const payment of payments) {
          await offlineDb.cache.put({
            id: payment.id,
            collection: 'fee_payments',
            data: payment,
            updatedAt: Date.now()
          });
        }
      }

      // Pre-cache today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .gte('recorded_at', today.toISOString());
      if (attendance) {
        for (const record of attendance) {
          await offlineDb.cache.put({
            id: record.id,
            collection: 'attendance',
            data: record,
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.warn('Preload failed:', err);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      preloadData();
    }
  }, [isOnline, preloadData]);

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

  const performAction = async <T,>(
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
    
    refreshQueueStatus();
    return { data: payload as T, error: null, queued: true } as any;
  };

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
