/**
 * Clinical Patient Recalls & Hygiene Dispensary Engine Facade (Мандат 8b: <= 120 строк)
 */

export * from "./recallCycleCatalog";
export * from "./recallDateMath";
export * from "./recallRecordTypes";
export * from "./recallMetricsCalculator";
export * from "./recallSmsAndMessaging";
export * from "./recallClinicalTriggers";
export * from "./recallProfile";
export * from "./recallFilterSort";
export * from "./recallActions";
export { determineTaskCallTypeForCandidate } from "./recallsCatalogData";

// Explicit disambiguation for star-export collisions between recallsCatalogData and modular submodules
export {
	buildWhatsAppUrl,
	buildTelegramUrl,
	generatePdnProtectedRecallMessage,
	generateWhatsAppRecallMessage,
	generateTelegramRecallMessage,
	generateSmsRecallMessage,
	buildRecallMessageContent,
} from "./recallSmsAndMessaging";

export {
	addCalendarMonthsSafe,
	addWeeksSafe,
	addDaysSafe,
	formatIsoDateOnly,
	calculateDaysOverdue,
	resolveUrgencyStatus,
} from "./recallDateMath";

// Clean aliases for legacy imports
import { sanitizePhoneNumber, extractFirstName } from "./recallSmsAndMessaging";
export const cleanPhoneDigits = sanitizePhoneNumber;
export const extractPatientFirstName = extractFirstName;
