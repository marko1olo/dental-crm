/**
 * publicBookingEngine.ts — High-Performance Pure Online Booking Engine Facade
 * Mandate 8b (Layer 5 Facade) & Mandate 8s (Modular Architecture).
 */

import {
	cleanPhoneDigits,
	formatPhoneNumber,
	formatRussianDate as canonicalFormatRussianDate,
	localDateString,
} from "../../utils/formatters";

export type {
	BookingContacts,
	BookingDoctor,
	BookingStep,
	CalendarExportPayload,
} from "./contracts/publicBookingContracts";

export {
	DEFAULT_DOCTORS_LIST,
	SERVICE_CATEGORIES,
	isValidPatientName,
	isValidRuPhone,
} from "./contracts/publicBookingContracts";

export type {
	SendOtpResult,
	VerificationMethod,
} from "./engine/bookingOtpEngine";

export { sendOtpVerificationRequest } from "./engine/bookingOtpEngine";

export type { BookingSlot } from "./engine/bookingSlotsPeriodEngine";

export {
	generateFallbackSlots,
	groupSlotsByDayPeriod,
	isClinicNightTime,
} from "./engine/bookingSlotsPeriodEngine";

export type { BookingReceiptData } from "./engine/bookingEmbedDispatchUtils";

export {
	detectTelegramWebApp,
	dispatchBookingCompletedMessage,
} from "./engine/bookingEmbedDispatchUtils";

export {
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
} from "./engine/publicBookingCalendarUtils";

export const normalizePhoneDigits = cleanPhoneDigits;
export const formatPhoneRu = formatPhoneNumber;
export const toLocalDateString = localDateString;

export function formatRussianDate(dateStr: string): string {
	return canonicalFormatRussianDate(dateStr, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}
