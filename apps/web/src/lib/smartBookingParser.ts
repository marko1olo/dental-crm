/**
 * smartBookingParser.ts — Фасад интеллектуального парсера быстрой записи пациента.
 */
import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "./bookingParserModules/bookingParserTypes.js";
import { parseSmartBooking } from "./bookingParserModules/bookingParserOrchestrator.js";

export * from "./bookingParserModules/bookingParserTypes.js";

export function smartBookingParser(
	text: string,
	dashboard: Dashboard,
): Partial<AppointmentScheduleDraft> {
	return parseSmartBooking(text, dashboard);
}
