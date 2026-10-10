/**
 * apps/api/src/services/publicBookingQueueService.ts
 * DENTE Dental CRM — Public Booking Queue Service Facade (Mandate 8b <= 30 lines)
 */
export {
	PublicBookingQueueService,
	publicBookingQueueService,
	DEFAULT_MORNING_CONFIRM_TIME,
	DEFAULT_CLINIC_OPEN_HOUR,
	DEFAULT_CLINIC_CLOSE_HOUR,
	DEFAULT_BUMP_DISCOUNT_PERCENT,
	OTP_COOLDOWN_MS,
	OTP_MAX_PER_PHONE_WINDOW,
	OTP_PHONE_WINDOW_MS,
	OTP_TTL_MS,
	OTP_MAX_ATTEMPTS,
} from "./publicBookingQueue/index.js";
export type {
	BookingStatus,
	BookingRequestInput,
	BookingReceipt,
	GracefulBumpSlotOption,
	GracefulBumpOffer,
	HoldingQueueItem,
	VerificationCodePayload,
	PublicBookingResult,
} from "./publicBookingQueue/index.js";
export * from "./publicBookingQueue/index.js";
