/**
 * Public Booking Domain Module Barrel
 *
 * Layer 0: Types & Schemas (types.ts)
 * Layer 1: Slot Availability & Timezone Math (slotAvailabilityEngine.ts)
 * Layer 1: SMS Verification & Anti-Spam Gate (smsVerificationAndSpamGate.ts)
 * Layer 2: Atomic Booking Mutation Service (bookingMutationService.ts)
 * Layer 3: Fastify Route Handlers (publicBookingHandlers.ts)
 */

export type {
	DaySchedule,
	DoctorScheduleWindow,
	PublicSlotDto,
} from "./types.js";

export {
	RATE_LIMIT_WINDOW_MS,
	RATE_LIMIT_MAX_REQUESTS,
	DEFAULT_TIMEZONE,
	DEFAULT_OPEN_MINUTE,
	DEFAULT_CLOSE_MINUTE,
	DEFAULT_SLOT_MINUTES,
	CLINIC_LINK_DEAD_MESSAGE,
	weekdayKeys,
	dateSchema,
	organizationIdSchema,
	optionalDoctorIdSchema,
	bookingRequestSchema,
	publicBookingFieldLabels,
	sendOtpSchema,
	cloudIntakeSchema,
	acceptBumpSchema,
} from "./types.js";

export {
	clockToMinutes,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	intersectWorkingWindows,
	timezoneOffsetMinutes,
	utcToLocalWallTime,
	localWallTimeToUtc,
	normalizePhoneDigits,
} from "./slotAvailabilityEngine.js";

export {
	isRateLimited,
	resetRateLimitsForTesting,
	requestPhoneVerification,
	verifyPhoneOtp,
} from "./smsVerificationAndSpamGate.js";

export {
	executeBookingTransaction,
	type BookingMutationParams,
	type BookingMutationResult,
} from "./bookingMutationService.js";

export {
	handleSlotsQuery,
	registerPublicBookingRoutes,
} from "./publicBookingHandlers.js";
