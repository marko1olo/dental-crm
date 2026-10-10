import { randomUUID } from "node:crypto";
import { getNationalPhoneDigits } from "@dental/shared";

export type BookingStatus =
	| "CONFIRMED"
	| "PENDING_RESERVATION"
	| "BUMPED_OFFER_PENDING"
	| "BUMPED_CONFIRMED"
	| "REJECTED_CONFLICT"
	| "CANCELLED";

export interface BookingRequestInput {
	organizationId: string;
	doctorId: string;
	patientName: string;
	patientPhone: string;
	startsAt: string; // ISO 8601
	endsAt: string; // ISO 8601
	comment?: string | undefined;
	chairId?: string | undefined;
	serviceName?: string | undefined;
	verificationCode?: string | undefined;
	source?: "widget" | "telegram" | "tilda" | "wordpress" | "site" | undefined;
}

export interface BookingReceipt {
	bookingId: string;
	referenceNumber: string;
	organizationId: string;
	doctorId: string;
	patientName: string;
	patientPhone: string;
	startsAt: string;
	endsAt: string;
	status: BookingStatus;
	isNightMode: boolean;
	message: string;
	morningConfirmTime?: string | undefined;
	softHoldExpiresAt?: string | undefined;
	appointmentId?: string | undefined;
	discountPercent?: number | undefined;
	discountNote?: string | undefined;
	createdAt: string;
}

export interface GracefulBumpSlotOption {
	startsAt: string;
	endsAt: string;
	label: string;
}

export interface GracefulBumpOffer {
	bookingId: string;
	originalStartsAt: string;
	originalEndsAt: string;
	recommendedSlots: GracefulBumpSlotOption[];
	discountPercent: number;
	discountNote: string;
	notificationPayload: {
		recipientPhone: string;
		channel: "sms" | "whatsapp";
		messageText: string;
		oneClickConfirmUrl: string;
	};
}

export interface HoldingQueueItem {
	id: string;
	referenceNumber: string;
	organizationId: string;
	doctorId: string;
	chairId?: string | null | undefined;
	patientName: string;
	patientPhone: string;
	startsAt: string;
	endsAt: string;
	comment?: string | undefined;
	serviceName?: string | undefined;
	status: BookingStatus;
	isNightMode: boolean;
	createdAt: string;
	softHoldExpiresAt: string;
	appointmentId?: string | null | undefined;
	bumpOffer?: GracefulBumpOffer | null | undefined;
	appliedDiscountPercent?: number | undefined;
}

export interface SoftHoldSlotLock {
	lockKey: string;
	organizationId: string;
	doctorId: string;
	startsAtMs: number;
	endsAtMs: number;
	bookingId: string;
	expiresAt: number;
}

export interface OtpChallenge {
	phone: string;
	code: string;
	expiresAt: number;
	challengeId: string;
	lastSentAt: number;
	sendCountInWindow: number;
	windowStart: number;
	failedAttempts: number;
}

export interface VerificationCodePayload {
	phone: string;
	method?: "sms" | "flash_call" | undefined;
	clientIp?: string | undefined;
	organizationId?: string | undefined;
}

export type PublicBookingResult = BookingReceipt;

export const DEFAULT_MORNING_CONFIRM_TIME = "08:30";
export const DEFAULT_CLINIC_OPEN_HOUR = 8.5; // 08:30
export const DEFAULT_CLINIC_CLOSE_HOUR = 21.0; // 21:00
export const DEFAULT_BUMP_DISCOUNT_PERCENT = 10;
export const OTP_COOLDOWN_MS = 60_000;
export const OTP_MAX_PER_PHONE_WINDOW = 3;
export const OTP_PHONE_WINDOW_MS = 600_000; // 10 min
export const OTP_TTL_MS = 5 * 60_000; // 5 min TTL
export const OTP_MAX_ATTEMPTS = 5; // maximum 5 failed attempts

export function formatReferenceNumber(): string {
	return `BKG-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export const normalizePhoneDigits = (phone: string | null | undefined): string =>
	getNationalPhoneDigits(phone);

export function makeReceipt(
	input: BookingRequestInput,
	bookingId: string,
	referenceNumber: string,
	status: BookingStatus,
	isNightMode: boolean,
	message: string,
	extra: Partial<BookingReceipt> = {},
): BookingReceipt {
	return {
		bookingId,
		referenceNumber,
		organizationId: input.organizationId,
		doctorId: input.doctorId,
		patientName: input.patientName,
		patientPhone: input.patientPhone,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		status,
		isNightMode,
		message,
		createdAt: extra.createdAt ?? new Date().toISOString(),
		...extra,
	};
}
