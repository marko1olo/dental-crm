/**
 * DENTE CRM — Offline CRDT Synchronization Engine: Storage Drivers
 * Layer 1: Memory & IndexedDB persistence drivers with graceful fallbacks.
 */

import { getAdjustedNowIso } from "../crdt.js";
import type {
	CrdtOutboxQueueItem,
	CrdtOutboxStatus,
	CrdtStorageDriver,
	MutationVector,
	SyncMutationEntityKind,
} from "./types.js";

/**
 * High-performance In-Memory CRDT Storage Driver (Ideal for Unit Tests and Node.js)
 */
export class MemoryCrdtStorageDriver implements CrdtStorageDriver {
	public readonly name = "memory";
	private readonly entities = new Map<string, { data: unknown; vector?: MutationVector | undefined }>();
	private readonly outbox = new Map<string, CrdtOutboxQueueItem>();
	private readonly kv = new Map<string, unknown>();

	public isAvailable(): boolean {
		return true;
	}

	public async saveEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
		data: T,
		vector?: MutationVector | undefined,
	): Promise<void> {
		this.entities.set(`${kind}:${id}`, { data, ...(vector ? { vector } : {}) });
	}

	public async loadEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<{ data: T; vector?: MutationVector | undefined } | null> {
		const found = this.entities.get(`${kind}:${id}`);
		if (!found) return null;
		return { data: found.data as T, ...(found.vector ? { vector: found.vector } : {}) };
	}

	public async listEntities<T>(
		kind: SyncMutationEntityKind,
	): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>> {
		const result: Array<{ id: string; data: T; vector?: MutationVector | undefined }> = [];
		const prefix = `${kind}:`;
		for (const [key, val] of this.entities.entries()) {
			if (key.startsWith(prefix)) {
				result.push({
					id: key.slice(prefix.length),
					data: val.data as T,
					...(val.vector ? { vector: val.vector } : {}),
				});
			}
		}
		return result;
	}

	public async deleteEntity(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<void> {
		this.entities.delete(`${kind}:${id}`);
	}

	public async enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void> {
		this.outbox.set(item.id, { ...item });
	}

	public async getPendingOutbox(): Promise<CrdtOutboxQueueItem[]> {
		return Array.from(this.outbox.values())
			.filter((it) => it.status === "pending" || it.status === "failed")
			.sort((a, b) => a.createdAtMs - b.createdAtMs);
	}

	public async getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null> {
		const item = this.outbox.get(id);
		return item ? { ...item } : null;
	}

	public async updateOutboxStatus(
		id: string,
		status: CrdtOutboxStatus,
		error?: string | undefined,
		lockOwner?: string | undefined,
	): Promise<void> {
		const item = this.outbox.get(id);
		if (item) {
			item.status = status;
			item.updatedAtIso = getAdjustedNowIso();
			if (error !== undefined) item.lastError = error;
			if (lockOwner !== undefined) item.lockOwner = lockOwner;
			if (status === "failed") item.retryCount += 1;
		}
	}

	public async pruneCommittedOutbox(): Promise<number> {
		let count = 0;
		for (const [id, item] of this.outbox.entries()) {
			if (item.status === "committed") {
				this.outbox.delete(id);
				count += 1;
			}
		}
		return count;
	}

	public async saveKv(key: string, value: unknown): Promise<void> {
		this.kv.set(key, value);
	}

	public async loadKv<T>(key: string): Promise<T | null> {
		const val = this.kv.get(key);
		return val !== undefined ? (val as T) : null;
	}

	public async clear(): Promise<void> {
		this.entities.clear();
		this.outbox.clear();
		this.kv.clear();
	}
}

/**
 * Universal IndexedDB Storage Driver with graceful LocalStorage / Memory Fallback
 */
export class IndexedDbCrdtStorageDriver implements CrdtStorageDriver {
	public readonly name = "indexeddb";
	private readonly fallback = new MemoryCrdtStorageDriver();
	private dbInstance: unknown = null;
	private readonly dbName: string;
	private readonly dbVersion: number;

	constructor(dbName = "dente-crdt-offline-vault", dbVersion = 1) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
	}

	public isAvailable(): boolean {
		const g = globalThis as { indexedDB?: unknown };
		return Boolean(g && g.indexedDB);
	}

	private async getDb(): Promise<any> {
		if (this.dbInstance) return this.dbInstance;
		const g = globalThis as { indexedDB?: any };
		if (!g.indexedDB) {
			throw new Error("IndexedDB is not available");
		}

		return new Promise<any>((resolve, reject) => {
			const req = g.indexedDB.open(this.dbName, this.dbVersion);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains("crdt_entities")) {
					db.createObjectStore("crdt_entities", { keyPath: "storageKey" });
				}
				if (!db.objectStoreNames.contains("crdt_outbox")) {
					const outStore = db.createObjectStore("crdt_outbox", { keyPath: "id" });
					outStore.createIndex("status", "status", { unique: false });
					outStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
				}
				if (!db.objectStoreNames.contains("crdt_kv")) {
					db.createObjectStore("crdt_kv", { keyPath: "key" });
				}
			};
			req.onsuccess = () => {
				this.dbInstance = req.result;
				resolve(this.dbInstance);
			};
			req.onerror = () => reject(req.error);
		});
	}

	public async saveEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
		data: T,
		vector?: MutationVector | undefined,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.saveEntity(kind, id, data, vector);
		}
		try {
			const db = await this.getDb();
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readwrite");
				const store = tx.objectStore("crdt_entities");
				const item = { storageKey: `${kind}:${id}`, kind, id, data, vector, updatedAt: Date.now() };
				const req = store.put(item);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.saveEntity(kind, id, data, vector);
		}
	}

	public async loadEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<{ data: T; vector?: MutationVector | undefined } | null> {
		if (!this.isAvailable()) {
			return this.fallback.loadEntity(kind, id);
		}
		try {
			const db = await this.getDb();
			return new Promise<{ data: T; vector?: MutationVector | undefined } | null>((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readonly");
				const store = tx.objectStore("crdt_entities");
				const req = store.get(`${kind}:${id}`);
				req.onsuccess = () => {
					if (!req.result) resolve(null);
					else resolve({ data: req.result.data, ...(req.result.vector ? { vector: req.result.vector } : {}) });
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.loadEntity(kind, id);
		}
	}

	public async listEntities<T>(
		kind: SyncMutationEntityKind,
	): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>> {
		if (!this.isAvailable()) {
			return this.fallback.listEntities(kind);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readonly");
				const store = tx.objectStore("crdt_entities");
				const req = store.getAll();
				req.onsuccess = () => {
					const rows = (req.result || [])
						.filter((r: { kind: string }) => r.kind === kind)
						.map((r: { id: string; data: T; vector?: MutationVector }) => ({
							id: r.id,
							data: r.data,
							...(r.vector ? { vector: r.vector } : {}),
						}));
					resolve(rows);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.listEntities(kind);
		}
	}

	public async deleteEntity(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.deleteEntity(kind, id);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readwrite");
				const store = tx.objectStore("crdt_entities");
				const req = store.delete(`${kind}:${id}`);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.deleteEntity(kind, id);
		}
	}

	public async enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.enqueueOutbox(item);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const req = store.put(item);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.enqueueOutbox(item);
		}
	}

	public async getPendingOutbox(): Promise<CrdtOutboxQueueItem[]> {
		if (!this.isAvailable()) {
			return this.fallback.getPendingOutbox();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readonly");
				const store = tx.objectStore("crdt_outbox");
				const req = store.getAll();
				req.onsuccess = () => {
					const items: CrdtOutboxQueueItem[] = (req.result || [])
						.filter((it: CrdtOutboxQueueItem) => it.status === "pending" || it.status === "failed")
						.sort((a: CrdtOutboxQueueItem, b: CrdtOutboxQueueItem) => a.createdAtMs - b.createdAtMs);
					resolve(items);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.getPendingOutbox();
		}
	}

	public async getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null> {
		if (!this.isAvailable()) {
			return this.fallback.getOutboxItem(id);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readonly");
				const store = tx.objectStore("crdt_outbox");
				const req = store.get(id);
				req.onsuccess = () => resolve(req.result || null);
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.getOutboxItem(id);
		}
	}

	public async updateOutboxStatus(
		id: string,
		status: CrdtOutboxStatus,
		error?: string | undefined,
		lockOwner?: string | undefined,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.updateOutboxStatus(id, status, error, lockOwner);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const getReq = store.get(id);
				getReq.onsuccess = () => {
					const item = getReq.result as CrdtOutboxQueueItem | undefined;
					if (!item) {
						resolve();
						return;
					}
					item.status = status;
					item.updatedAtIso = getAdjustedNowIso();
					if (error !== undefined) item.lastError = error;
					if (lockOwner !== undefined) item.lockOwner = lockOwner;
					if (status === "failed") item.retryCount += 1;
					const putReq = store.put(item);
					putReq.onsuccess = () => resolve();
					putReq.onerror = () => reject(putReq.error);
				};
				getReq.onerror = () => reject(getReq.error);
			});
		} catch {
			return this.fallback.updateOutboxStatus(id, status, error, lockOwner);
		}
	}

	public async pruneCommittedOutbox(): Promise<number> {
		if (!this.isAvailable()) {
			return this.fallback.pruneCommittedOutbox();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const req = store.getAll();
				req.onsuccess = () => {
					const all = (req.result || []) as CrdtOutboxQueueItem[];
					let pruned = 0;
					for (const item of all) {
						if (item.status === "committed") {
							store.delete(item.id);
							pruned += 1;
						}
					}
					resolve(pruned);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.pruneCommittedOutbox();
		}
	}

	public async saveKv(key: string, value: unknown): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.saveKv(key, value);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_kv", "readwrite");
				const store = tx.objectStore("crdt_kv");
				const req = store.put({ key, value });
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.saveKv(key, value);
		}
	}

	public async loadKv<T>(key: string): Promise<T | null> {
		if (!this.isAvailable()) {
			return this.fallback.loadKv(key);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_kv", "readonly");
				const store = tx.objectStore("crdt_kv");
				const req = store.get(key);
				req.onsuccess = () => {
					if (!req.result) resolve(null);
					else resolve(req.result.value as T);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.loadKv(key);
		}
	}

	public async clear(): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.clear();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction(["crdt_entities", "crdt_outbox", "crdt_kv"], "readwrite");
				tx.objectStore("crdt_entities").clear();
				tx.objectStore("crdt_outbox").clear();
				tx.objectStore("crdt_kv").clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} catch {
			return this.fallback.clear();
		}
	}
}
