/**
 * storageDriverInterface.ts — Интерфейс абстрактного хранилища очереди диктовки
 */

import type { PendingTranscriptionRecord } from "./types";

export interface StorageDriver {
	get(id: string): Promise<PendingTranscriptionRecord | null>;
	getAll(): Promise<PendingTranscriptionRecord[]>;
	put(record: PendingTranscriptionRecord): Promise<void>;
	delete(id: string): Promise<void>;
	clear(): Promise<void>;
}
