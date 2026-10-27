/**
 * inMemoryStorageDriver.ts — In-Memory драйвер очереди для SSR и тестовых сред без IndexedDB
 */

import type { PendingTranscriptionRecord } from "./types";
import type { StorageDriver } from "./storageDriverInterface";

export class InMemoryStorageDriver implements StorageDriver {
	private records = new Map<string, PendingTranscriptionRecord>();

	public async get(id: string): Promise<PendingTranscriptionRecord | null> {
		const rec = this.records.get(id);
		return rec ? { ...rec } : null;
	}

	public async getAll(): Promise<PendingTranscriptionRecord[]> {
		const items = Array.from(this.records.values()).map((r) => ({ ...r }));
		items.sort((a, b) => a.timestamp - b.timestamp);
		return items;
	}

	public async put(record: PendingTranscriptionRecord): Promise<void> {
		this.records.set(record.id, { ...record });
	}

	public async delete(id: string): Promise<void> {
		this.records.delete(id);
	}

	public async clear(): Promise<void> {
		this.records.clear();
	}
}
