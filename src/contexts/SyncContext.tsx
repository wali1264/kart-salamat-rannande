import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineDb, SyncQueueItem, CachedData } from '../lib/db';
import { supabase } from '../lib/supabase';

interface SyncContextType {
  isOnline: boolean;
  queueCount: number;
  failedItems: SyncQueueItem[];
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  performAction: <T>(
    table: string,
    action: 'insert' | 'update' | 'delete',
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
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueStatus = useCallback(async () => {
    const pending = await offlineDb.syncQueue.where('status').equals('pending').count();
    const failed = await offlineDb.syncQueue.where('status').equals('failed').toArray();
    setQueueCount(pending);
    setFailedItems(failed);
  }, []);

  useEffect(() => {
    refreshQueueStatus();
    // Refresh periodically or on focus
    const interval = setInterval(refreshQueueStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshQueueStatus]);

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

      for (const item of items) {
        try {
          let error = null;
          if (item.type === 'insert') {
            const { error: e } = await supabase.from(item.collection).insert(item.payload);
            error = e;
          } else if (item.type === 'update') {
            const { error: e } = await supabase.from(item.collection).update(item.payload).eq('id', item.payload.id);
            error = e;
          } else if (item.type === 'delete') {
            const { error: e } = await supabase.from(item.collection).delete().eq('id', item.payload.id);
            error = e;
          }

          if (!error) {
            await offlineDb.syncQueue.delete(item.id!);
          } else {
            console.error('Sync failed for item:', item.id, error);
            await offlineDb.syncQueue.update(item.id!, { 
              status: 'failed', 
              error: error.message || JSON.stringify(error) 
            });
          }
        } catch (e) {
          console.error('Unexpected sync error:', e);
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
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  const performAction = async <T,>(
    table: string,
    action: 'insert' | 'update' | 'delete',
    payload: any,
    apiCall: () => Promise<{ data: T | null; error: any }>
  ) => {
    if (isOnline) {
      const result = await apiCall();
      if (!result.error) {
        // Option to update cache here if needed
        return result;
      }
    }

    // If offline or online call failed (e.g. network timeout), queue it
    await offlineDb.syncQueue.add({
      type: action,
      collection: table,
      payload,
      status: 'pending',
      timestamp: Date.now()
    });
    
    refreshQueueStatus();
    
    // Return a "success" response to the UI but with a flag indicating it's queued
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
      failedItems, 
      isSyncing, 
      syncNow, 
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
