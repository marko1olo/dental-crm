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
export {
	buildTelegramUrl,
	buildWhatsAppUrl,
	generatePdnProtectedRecallMessage,
	generateWhatsAppRecallMessage,
	generateTelegramRecallMessage,
	generateSmsRecallMessage,
	buildRecallMessageContent,
	calculateSmsSegments,
	formatSmsSummary,
} from "./recallSmsAndMessaging";

// Clean aliases for legacy imports
import { sanitizePhoneNumber, extractFirstName } from "./recallSmsAndMessaging";
export const cleanPhoneDigits = sanitizePhoneNumber;
export const extractPatientFirstName = extractFirstName;
