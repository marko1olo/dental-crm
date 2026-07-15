import { useEffect, useCallback } from 'react';
import { showToast } from '../components/GlobalToast';

const DB_NAME = 'DenteOfflineDB';
const STORE_NAME = 'syncQueue';

export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

// Open DB helper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const enqueueRequest = async (req: Omit<OfflineRequest, 'id' | 'timestamp'>) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const item: OfflineRequest = {
      ...req,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    const request = store.add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const fetchQueue = async (): Promise<OfflineRequest[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFromQueue = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export function useOfflineQueue() {
  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const queue = await fetchQueue();
      if (queue.length === 0) return;
      
      showToast(`Синхронизация данных: ${queue.length} запросов`, "success");
      
      for (const item of queue.sort((a,b) => a.timestamp - b.timestamp)) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body
          });
          if (res.ok || res.status >= 400) {
            // Either succeeded or failed permanently, remove from queue
            await deleteFromQueue(item.id);
          }
        } catch (e) {
          console.error("Failed to sync offline request", e);
          break; // Stop syncing if fetch fails again (likely still offline)
        }
      }
    } catch (e) {
      console.error("Error processing offline queue", e);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, [processQueue]);

  return { processQueue, enqueueRequest };
}
