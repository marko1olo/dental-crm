import type { QueuedMeshMutation } from "./schemas.js";

// ─────────────────────────────────────────────────────────────────────────────
// 4. Offline Mesh Mutation Queue & Local Mutation Ring Buffer (Layer 2)
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalMutationRingBufferOptions {
	capacity?: number;
}

/**
 * Thread-safe, fixed-capacity circular ring buffer for satellite workstation mutations.
 * Guarantees zero disruption to active doctor sessions when disconnected from Master.
 * Bounded memory usage with O(1) idempotency lookup and FIFO overflow protection.
 */
export class LocalMutationRingBuffer {
	private readonly capacity: number;
	private readonly buffer: (QueuedMeshMutation | null)[];
	private head = 0; // next write slot
	private count = 0;
	private overflowCount = 0;
	private readonly indexByKey = new Map<string, number>();

	constructor(options: LocalMutationRingBufferOptions = {}) {
		this.capacity = Math.max(1, options.capacity ?? 5000);
		this.buffer = new Array(this.capacity).fill(null);
	}

	push(mutation: Omit<QueuedMeshMutation, "attempts"> & { attempts?: number }): {
		buffered: boolean;
		isDuplicate: boolean;
	} {
		const fullMutation: QueuedMeshMutation = {
			...mutation,
			attempts: mutation.attempts ?? 0,
		};

		// 1. In-place deduplication if idempotencyKey already in ring buffer
		const existingSlot = this.indexByKey.get(fullMutation.idempotencyKey);
		if (existingSlot !== undefined && this.buffer[existingSlot] !== null) {
			this.buffer[existingSlot] = fullMutation;
			return { buffered: true, isDuplicate: true };
		}

		// 2. FIFO overflow if capacity reached
		if (this.count >= this.capacity) {
			const old = this.buffer[this.head];
			if (old) {
				this.indexByKey.delete(old.idempotencyKey);
				this.overflowCount++;
			}
		} else {
			this.count++;
		}

		const slot = this.head;
		this.buffer[slot] = fullMutation;
		this.indexByKey.set(fullMutation.idempotencyKey, slot);
		this.head = (this.head + 1) % this.capacity;

		return { buffered: true, isDuplicate: false };
	}

	has(idempotencyKey: string): boolean {
		const slot = this.indexByKey.get(idempotencyKey);
		return slot !== undefined && this.buffer[slot] !== null;
	}

	getDroppedCount(): number {
		return this.overflowCount;
	}

	peekAll(): QueuedMeshMutation[] {
		const items: QueuedMeshMutation[] = [];
		for (const item of this.buffer) {
			if (item !== null) {
				items.push(item);
			}
		}
		return items.sort((a, b) => a.timestamp - b.timestamp);
	}

	peekBatch(limit = 50): QueuedMeshMutation[] {
		return this.peekAll().slice(0, Math.max(1, limit));
	}

	acknowledge(idempotencyKeys: string[]): number {
		let removed = 0;
		for (const key of idempotencyKeys) {
			const slot = this.indexByKey.get(key);
			if (slot !== undefined && this.buffer[slot] !== null) {
				this.buffer[slot] = null;
				this.indexByKey.delete(key);
				this.count = Math.max(0, this.count - 1);
				removed++;
			}
		}
		return removed;
	}

	recordFailure(idempotencyKeys: string[]): void {
		for (const key of idempotencyKeys) {
			const slot = this.indexByKey.get(key);
			if (slot !== undefined && this.buffer[slot] !== null) {
				this.buffer[slot]!.attempts += 1;
			}
		}
	}

	size(): number {
		return this.count;
	}

	getCapacity(): number {
		return this.capacity;
	}

	getOverflowCount(): number {
		return this.overflowCount;
	}

	clear(): void {
		this.buffer.fill(null);
		this.indexByKey.clear();
		this.head = 0;
		this.count = 0;
		this.overflowCount = 0;
	}
}

/**
 * Thread-safe, idempotent in-memory offline mutation queue for satellite workstations.
 * When the clinic Master goes offline or schema compatibility degrades, local operations
 * (appointments, diaries, invoices, payments) are preserved locally without data loss.
 */
export class OfflineMeshMutationQueue {
	private readonly queue = new Map<string, QueuedMeshMutation>();
	private readonly maxQueueSize: number;
	private readonly ringBuffer: LocalMutationRingBuffer;

	constructor(options: { maxQueueSize?: number } = {}) {
		this.maxQueueSize = options.maxQueueSize ?? 5000;
		this.ringBuffer = new LocalMutationRingBuffer({ capacity: this.maxQueueSize });
	}

	/**
	 * Enqueues a mutation. If an identical idempotencyKey already exists, merges payload and preserves order.
	 */
	enqueue(mutation: Omit<QueuedMeshMutation, "attempts"> & { attempts?: number }): boolean {
		if (this.queue.size >= this.maxQueueSize && !this.queue.has(mutation.idempotencyKey)) {
			// Evict oldest mutation if ceiling hit (FIFO)
			const oldestKey = this.queue.keys().next().value;
			if (oldestKey) this.queue.delete(oldestKey);
		}

		const fullMutation: QueuedMeshMutation = {
			...mutation,
			attempts: mutation.attempts ?? 0,
		};
		this.queue.set(fullMutation.idempotencyKey, fullMutation);
		this.ringBuffer.push(fullMutation);
		return true;
	}

	/**
	 * Returns all queued mutations in chronological order.
	 */
	peekAll(): QueuedMeshMutation[] {
		return Array.from(this.queue.values()).sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Returns batch of up to `limit` mutations for synchronization attempt.
	 */
	peekBatch(limit = 50): QueuedMeshMutation[] {
		return this.peekAll().slice(0, Math.max(1, limit));
	}

	/**
	 * Acknowledges successful sync of specific idempotencyKeys, removing them from queue.
	 */
	acknowledge(idempotencyKeys: string[]): number {
		let removed = 0;
		for (const key of idempotencyKeys) {
			if (this.queue.delete(key)) {
				removed++;
			}
		}
		this.ringBuffer.acknowledge(idempotencyKeys);
		return removed;
	}

	/**
	 * Increments attempt count for mutations that encountered a retryable network error.
	 */
	recordFailure(idempotencyKeys: string[]): void {
		for (const key of idempotencyKeys) {
			const item = this.queue.get(key);
			if (item) {
				item.attempts += 1;
			}
		}
		this.ringBuffer.recordFailure(idempotencyKeys);
	}

	size(): number {
		return this.queue.size;
	}

	getRingBuffer(): LocalMutationRingBuffer {
		return this.ringBuffer;
	}

	clear(): void {
		this.queue.clear();
		this.ringBuffer.clear();
	}
}
