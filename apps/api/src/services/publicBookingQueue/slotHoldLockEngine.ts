import type { SoftHoldSlotLock } from "./types.js";

export type QueueOverlapChecker = (
	organizationId: string,
	doctorId: string,
	bookingId: string,
	candidateStart: number,
	candidateEnd: number,
	now: number,
) => boolean;

export class SlotHoldLockEngine {
	private activeSoftHoldLocks = new Map<string, SoftHoldSlotLock>();
	private queueOverlapChecker: QueueOverlapChecker | null = null;

	public setQueueOverlapChecker(checker: QueueOverlapChecker | null): void {
		this.queueOverlapChecker = checker;
	}

	/**
	 * Atomic slot lock manager for night buffer queue (prevents 03:15 race conditions).
	 */
	public tryAcquireSoftSlotLock(
		organizationId: string,
		doctorId: string,
		startsAt: Date,
		endsAt: Date,
		bookingId: string,
		ttlMs: number = 14 * 60 * 60_000,
		overrideChecker?: QueueOverlapChecker,
	): boolean {
		const now = Date.now();
		const candidateStart = startsAt.getTime();
		const candidateEnd = endsAt.getTime();

		// Purge expired locks
		for (const [key, lock] of this.activeSoftHoldLocks.entries()) {
			if (now >= lock.expiresAt) this.activeSoftHoldLocks.delete(key);
		}

		// Check overlap across active non-expired locks
		for (const lock of this.activeSoftHoldLocks.values()) {
			if (
				lock.organizationId === organizationId &&
				lock.doctorId === doctorId &&
				lock.bookingId !== bookingId &&
				now < lock.expiresAt &&
				candidateStart < lock.endsAtMs &&
				candidateEnd > lock.startsAtMs
			) {
				return false;
			}
		}

		// Verify against holding queue
		const checker = overrideChecker ?? this.queueOverlapChecker;
		if (checker && checker(organizationId, doctorId, bookingId, candidateStart, candidateEnd, now)) {
			return false;
		}

		const lockKey = `${organizationId}:${doctorId}:${startsAt.toISOString()}`;
		this.activeSoftHoldLocks.set(lockKey, {
			lockKey,
			organizationId,
			doctorId,
			startsAtMs: candidateStart,
			endsAtMs: candidateEnd,
			bookingId,
			expiresAt: now + ttlMs,
		});
		return true;
	}

	public releaseSoftSlotLock(organizationId: string, doctorId: string, startsAt: Date): void {
		this.activeSoftHoldLocks.delete(`${organizationId}:${doctorId}:${startsAt.toISOString()}`);
	}

	public clearLocks(organizationId?: string): void {
		if (!organizationId) {
			this.activeSoftHoldLocks.clear();
		} else {
			for (const [key, lock] of this.activeSoftHoldLocks.entries()) {
				if (lock.organizationId === organizationId) {
					this.activeSoftHoldLocks.delete(key);
				}
			}
		}
	}
}

export const slotHoldLockEngine = new SlotHoldLockEngine();
