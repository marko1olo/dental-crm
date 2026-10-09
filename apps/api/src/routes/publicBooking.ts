/**
 * Canonical Facade for Public Booking Routes.
 * Decomposed into modular components in ./publicBooking/
 *
 * Layer 0: types.ts (Schemas & DTOs)
 * Layer 1: slotAvailabilityEngine.ts (Calendar Math & Slot Finder)
 * Layer 1: smsVerificationAndSpamGate.ts (OTP & Rate Limiting)
 * Layer 2: bookingMutationService.ts (Atomic Booking & Concurrency Locks)
 * Layer 3: publicBookingHandlers.ts (Fastify Handlers)
 */

export type {
	DaySchedule,
	DoctorScheduleWindow,
	PublicSlotDto,
} from "./publicBooking/index.js";

export {
	clockToMinutes,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	intersectWorkingWindows,
	timezoneOffsetMinutes,
	utcToLocalWallTime,
	localWallTimeToUtc,
	registerPublicBookingRoutes,
} from "./publicBooking/index.js";
