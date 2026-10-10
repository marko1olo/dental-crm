import {
	BookingRateLimiter,
	bookingRateLimiter,
} from "./bookingRateLimiter.js";
import {
	BookingVerificationEngine,
	bookingVerificationEngine,
} from "./bookingVerificationEngine.js";
import {
	BookingQueueProcessor,
	bookingQueueProcessor,
} from "./bookingQueueProcessor.js";
import {
	SlotHoldLockEngine,
	slotHoldLockEngine,
} from "./slotHoldLockEngine.js";
import type {
	BookingReceipt,
	BookingRequestInput,
	BookingStatus,
	GracefulBumpSlotOption,
	HoldingQueueItem,
} from "./types.js";

export class PublicBookingQueueService {
	constructor(
		private queueProcessor: BookingQueueProcessor = bookingQueueProcessor,
		private lockEngine: SlotHoldLockEngine = slotHoldLockEngine,
		private verificationEngine: BookingVerificationEngine = bookingVerificationEngine,
		private rateLimiter: BookingRateLimiter = bookingRateLimiter,
	) {}

	public setClinicOnlineOverride(organizationId: string, isOnline: boolean | null): void {
		this.queueProcessor.setClinicOnlineOverride(organizationId, isOnline);
	}

	public async isClinicOnline(organizationId: string, now: Date = new Date()): Promise<boolean> {
		return this.queueProcessor.isClinicOnline(organizationId, now);
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
	): boolean {
		return this.lockEngine.tryAcquireSoftSlotLock(
			organizationId,
			doctorId,
			startsAt,
			endsAt,
			bookingId,
			ttlMs,
		);
	}

	public releaseSoftSlotLock(organizationId: string, doctorId: string, startsAt: Date): void {
		this.lockEngine.releaseSoftSlotLock(organizationId, doctorId, startsAt);
	}

	/**
	 * Rate limited OTP sender with cooldown (prevents bot abuse of clinic SMS balance).
	 */
	public requestPhoneVerification(
		phone: string,
		method: "sms" | "flash_call" = "sms",
		clientIp: string = "unknown",
		organizationId?: string,
	): { allowed: boolean; message: string; cooldownSeconds?: number; challengeId?: string } {
		return this.verificationEngine.requestPhoneVerification(
			phone,
			method,
			clientIp,
			organizationId,
		);
	}

	public verifyPhoneOtp(phone: string, code: string): { valid: boolean; error?: string } {
		return this.verificationEngine.verifyPhoneOtp(phone, code);
	}

	public async submitBooking(
		input: BookingRequestInput,
		options: { now?: Date; useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		return this.queueProcessor.submitBooking(input, options);
	}

	public async processHoldingQueue(
		organizationId: string,
		options: {
			useDb?: boolean;
			availableAdjacentSlotsFinder?: (
				doctorId: string,
				startsAt: Date,
			) => Promise<GracefulBumpSlotOption[]> | GracefulBumpSlotOption[];
		} = {},
	): Promise<{ processed: number; confirmed: number; bumped: number; items: HoldingQueueItem[] }> {
		return this.queueProcessor.processHoldingQueue(organizationId, options);
	}

	public async acceptBumpedSlot(
		organizationId: string,
		bookingId: string,
		chosenSlot: { startsAt: string; endsAt: string },
		options: { useDb?: boolean } = {},
	): Promise<BookingReceipt> {
		return this.queueProcessor.acceptBumpedSlot(organizationId, bookingId, chosenSlot, options);
	}

	public getHoldingQueue(organizationId?: string, status?: BookingStatus): HoldingQueueItem[] {
		return this.queueProcessor.getHoldingQueue(organizationId, status);
	}

	public getHoldingQueueItem(bookingId: string): HoldingQueueItem | undefined {
		return this.queueProcessor.getHoldingQueueItem(bookingId);
	}

	public clearHoldingQueue(organizationId?: string): void {
		this.queueProcessor.clearHoldingQueue(organizationId);
		this.lockEngine.clearLocks(organizationId);
		if (!organizationId) {
			this.rateLimiter.clearRateLimits();
			this.verificationEngine.clearChallenges();
		}
	}
}

export const publicBookingQueueService = new PublicBookingQueueService();

export {
	BookingRateLimiter,
	bookingRateLimiter,
	SlotHoldLockEngine,
	slotHoldLockEngine,
	BookingVerificationEngine,
	bookingVerificationEngine,
	BookingQueueProcessor,
	bookingQueueProcessor,
};

export {
	DEFAULT_MORNING_CONFIRM_TIME,
	DEFAULT_CLINIC_OPEN_HOUR,
	DEFAULT_CLINIC_CLOSE_HOUR,
	DEFAULT_BUMP_DISCOUNT_PERCENT,
	OTP_COOLDOWN_MS,
	OTP_MAX_PER_PHONE_WINDOW,
	OTP_PHONE_WINDOW_MS,
	OTP_TTL_MS,
	OTP_MAX_ATTEMPTS,
	formatReferenceNumber,
	normalizePhoneDigits,
	makeReceipt,
} from "./types.js";

export type {
	BookingStatus,
	BookingRequestInput,
	BookingReceipt,
	GracefulBumpSlotOption,
	GracefulBumpOffer,
	HoldingQueueItem,
	SoftHoldSlotLock,
	OtpChallenge,
	VerificationCodePayload,
	PublicBookingResult,
} from "./types.js";
