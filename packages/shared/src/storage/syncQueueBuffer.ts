/**
 * DENTE CRM — Emergency Offline Sync Queue & Transaction Buffer
 *
 * Гарантированное сохранение транзакций клиники при обрыве связи:
 * - Монотонная нумерация транзакций
 * - Защита от потери данных при перезагрузке страницы и сбоях браузера
 * - Индикатор режима выживаемости (ONLINE_SYNCED / OFFLINE_BUFFERING)
 * - Автоматический подсчет телеметрии и контроль переполнения буфера
 */

import { computePayloadHash } from "../sync/hashing.js";
import type {
	OfflineSyncQueueItem,
	OfflineSyncQueueStatus,
	ReplicationMode,
	SnapshotDriverType,
} from "./types.js";

export class SyncQueueBufferManager {
	private queue: OfflineSyncQueueItem[] = [];
	private sequenceCounter = 0;
	private storageDriver: SnapshotDriverType;
	private isOnline = true;
	private lastReplicatedTimestampMs: number | null = null;
	private organizationId?: string | undefined;

	constructor(options?: {
		storageDriver?: SnapshotDriverType | undefined;
		organizationId?: string | undefined;
		initialItems?: OfflineSyncQueueItem[] | undefined;
	}) {
		this.storageDriver = options?.storageDriver || "indexeddb";
		this.organizationId = options?.organizationId;
		if (Array.isArray(options?.initialItems)) {
			this.queue = [...options.initialItems];
			this.sequenceCounter = this.queue.reduce(
				(max, item) => Math.max(max, item.sequenceNumber || 0),
				0,
			);
		}
	}

	public setOnlineStatus(online: boolean): void {
		this.isOnline = online;
	}

	public getOnlineStatus(): boolean {
		return this.isOnline;
	}

	/**
	 * Atomically enqueues a new offline transaction / mutation into the buffer.
	 */
	public enqueue<T = unknown>(input: {
		mutationId: string;
		entityType: string;
		entityId: string;
		action: string;
		payload: T;
		organizationId?: string | undefined;
	}): OfflineSyncQueueItem<T> {
		this.sequenceCounter++;
		const now = Date.now();
		const item: OfflineSyncQueueItem<T> = {
			id: `q_${now}_${this.sequenceCounter}`,
			mutationId: input.mutationId,
			entityType: input.entityType,
			entityId: input.entityId,
			action: input.action,
			timestampIso: new Date(now).toISOString(),
			timestampMs: now,
			sequenceNumber: this.sequenceCounter,
			organizationId: input.organizationId || this.organizationId,
			payload: input.payload,
			payloadHash: computePayloadHash(input.payload),
			status: "pending",
			retryCount: 0,
		};
		this.queue.push(item);
		return item;
	}

	/**
	 * Lists pending items in chronological order.
	 */
	public getPendingItems(): OfflineSyncQueueItem[] {
		return this.queue.filter((item) => item.status === "pending" || item.status === "failed");
	}

	/**
	 * Marks items as in-flight during replication.
	 */
	public markInFlight(ids: string[], lockOwner: string): void {
		for (const item of this.queue) {
			if (ids.includes(item.id)) {
				item.status = "in_flight";
				item.lockOwner = lockOwner;
			}
		}
	}

	/**
	 * Marks items as committed after successful sync to server.
	 */
	public markCommitted(ids: string[]): void {
		const now = Date.now();
		this.lastReplicatedTimestampMs = now;
		for (const item of this.queue) {
			if (ids.includes(item.id)) {
				item.status = "committed";
				item.lockOwner = undefined;
			}
		}
	}

	/**
	 * Marks items as failed with error.
	 */
	public markFailed(ids: string[], errorMessage: string): void {
		for (const item of this.queue) {
			if (ids.includes(item.id)) {
				item.status = "failed";
				item.retryCount++;
				item.lastError = errorMessage;
				item.lockOwner = undefined;
			}
		}
	}

	/**
	 * Prunes committed items from the buffer to preserve memory.
	 */
	public pruneCommitted(): number {
		const initialCount = this.queue.length;
		this.queue = this.queue.filter((item) => item.status !== "committed");
		return initialCount - this.queue.length;
	}

	/**
	 * Returns current queue telemetry and survivability status.
	 */
	public getStatus(): OfflineSyncQueueStatus {
		let pendingCount = 0;
		let inFlightCount = 0;
		let failedCount = 0;
		let committedCount = 0;
		let oldestPendingTimestampMs: number | null = null;

		for (const item of this.queue) {
			if (item.status === "pending") {
				pendingCount++;
				if (oldestPendingTimestampMs === null || item.timestampMs < oldestPendingTimestampMs) {
					oldestPendingTimestampMs = item.timestampMs;
				}
			} else if (item.status === "in_flight") {
				inFlightCount++;
			} else if (item.status === "failed") {
				failedCount++;
			} else if (item.status === "committed") {
				committedCount++;
			}
		}

		let mode: ReplicationMode = "ONLINE_SYNCED";
		if (!this.isOnline) {
			mode = "OFFLINE_BUFFERING";
		} else if (inFlightCount > 0) {
			mode = "REPLICATING";
		} else if (failedCount > 0) {
			mode = "ERROR";
		}

		let survivabilityGrade: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
		if (failedCount > 10 || (pendingCount > 500 && !this.isOnline)) {
			survivabilityGrade = "CRITICAL";
		} else if (pendingCount > 0 || failedCount > 0 || !this.isOnline) {
			survivabilityGrade = "DEGRADED";
		}

		return {
			mode,
			totalPending: pendingCount,
			inFlightCount,
			failedCount,
			committedCount,
			oldestPendingTimestampMs,
			lastReplicatedTimestampMs: this.lastReplicatedTimestampMs,
			isOnline: this.isOnline,
			storageDriver: this.storageDriver,
			survivabilityGrade,
			unflushedMemoryBytes: JSON.stringify(this.queue).length,
		};
	}

	/**
	 * Serializes queue state for offline persistence (LocalStorage/IndexedDB).
	 */
	public serialize(): string {
		return JSON.stringify({
			sequenceCounter: this.sequenceCounter,
			lastReplicatedTimestampMs: this.lastReplicatedTimestampMs,
			queue: this.queue,
		});
	}

	/**
	 * Restores queue state from persistence.
	 */
	public static deserialize(serialized: string, driver: SnapshotDriverType = "indexeddb"): SyncQueueBufferManager {
		try {
			const parsed = JSON.parse(serialized);
			const manager = new SyncQueueBufferManager({
				storageDriver: driver,
				initialItems: parsed.queue,
			});
			if (typeof parsed.sequenceCounter === "number") {
				(manager as any).sequenceCounter = parsed.sequenceCounter;
			}
			if (typeof parsed.lastReplicatedTimestampMs === "number") {
				(manager as any).lastReplicatedTimestampMs = parsed.lastReplicatedTimestampMs;
			}
			return manager;
		} catch {
			return new SyncQueueBufferManager({ storageDriver: driver });
		}
	}
}
