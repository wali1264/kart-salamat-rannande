import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  type: 'insert' | 'update' | 'delete';
  collection: string;
  payload: any;
  status: 'pending' | 'failed' | 'synced';
  error?: string;
  timestamp: number;
}

export interface CachedData {
  id: string;
  collection: string;
  data: any;
  updatedAt: number;
}

export class OfflineDB extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  cache!: Table<CachedData>;

  constructor() {
    super('OfflineDB');
    this.version(1).stores({
      syncQueue: '++id, type, collection, status, timestamp',
      cache: '[collection+id], collection, id'
    });
  }
}

export const offlineDb = new OfflineDB();
