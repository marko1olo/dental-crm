/**
 * indexedDbStorageDriver.ts — Персистентный драйвер очереди на базе нативного IndexedDB
 */

import { type PendingTranscriptionRecord, VOICE_OFFLINE_STORE_NAME } from "./types";
import type { StorageDriver } from "./storageDriverInterface";

export class IndexedDbStorageDriver implements StorageDriver {
	private dbName: string;
	private dbVersion: number;
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(dbName: string, dbVersion: number) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
	}

	private getDb(): Promise<IDBDatabase> {
		if (this.dbPromise) return this.dbPromise;

		this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
			if (typeof window === "undefined" || !("indexedDB" in window)) {
				reject(new Error("IndexedDB is not available in current environment"));
				return;
			}

			const request = window.indexedDB.open(this.dbName, this.dbVersion);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(VOICE_OFFLINE_STORE_NAME)) {
					const store = db.createObjectStore(VOICE_OFFLINE_STORE_NAME, { keyPath: "id" });
					store.createIndex("timestamp", "timestamp");
					store.createIndex("status", "status");
					store.createIndex("retryCount", "retryCount");
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					db.close();
					this.dbPromise = null;
				};
				db.onclose = () => {
					this.dbPromise = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				this.dbPromise = null;
				reject(request.error || new Error("Failed to open IndexedDB"));
			};
		});

		return this.dbPromise;
	}

	public async get(id: string): Promise<PendingTranscriptionRecord | null> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readonly");
			const request = tx.objectStore(VOICE_OFFLINE_STORE_NAME).get(id);
			request.onsuccess = () => resolve((request.result as PendingTranscriptionRecord) || null);
			request.onerror = () => reject(request.error || new Error(`Failed to get record ${id}`));
		});
	}

	public async getAll(): Promise<PendingTranscriptionRecord[]> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readonly");
			const request = tx.objectStore(VOICE_OFFLINE_STORE_NAME).getAll();
			request.onsuccess = () => {
				const items = (request.result as PendingTranscriptionRecord[]) || [];
				items.sort((a, b) => a.timestamp - b.timestamp);
				resolve(items);
			};
			request.onerror = () => reject(request.error || new Error("Failed to fetch all records"));
		});
	}

	public async put(record: PendingTranscriptionRecord): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const request = tx.objectStore(VOICE_OFFLINE_STORE_NAME).put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error || new Error(`Failed to put record ${record.id}`));
		});
	}

	public async delete(id: string): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const request = tx.objectStore(VOICE_OFFLINE_STORE_NAME).delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error || new Error(`Failed to delete record ${id}`));
		});
	}

	public async clear(): Promise<void> {
		const db = await this.getDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction([VOICE_OFFLINE_STORE_NAME], "readwrite");
			const request = tx.objectStore(VOICE_OFFLINE_STORE_NAME).clear();
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error || new Error("Failed to clear offline store"));
		});
	}
}
