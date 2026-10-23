/**
 * DENTE Dental CRM — Online Booking Utilities & Contracts Facade
 * Mandate 8b (Layer 5 Facade) & Mandate 8s (Modular Architecture)
 */

import {
	formatRussianDate as canonicalFormatRussianDate,
	localDateString as canonicalLocalDateString,
} from "../../utils/formatters";

export type {
	BookingConfirmationData,
	ClinicBranch,
	PopularService,
	PublicOnlineBookingWidgetProps,
	ServiceCategory,
} from "./contracts/bookingContracts";

export {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
} from "./presets/bookingCategoryPresets";

export { buildCalendarDays } from "./engine/bookingCalendarUtils";

export {
	generateBookingReference,
	generateEmbedSnippet,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
} from "./engine/bookingCalendarExportUtils";

export {
	formatRussianPhone,
	isValidRussianPhone,
} from "./engine/bookingPhoneUtils";

export { resolveCategoryIcon } from "./engine/bookingCategoryIconUtils";

export const localDateString = canonicalLocalDateString;

export function formatRussianDate(isoDateString: string): string {
	return canonicalFormatRussianDate(isoDateString, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}
