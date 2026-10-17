/**
 * Omnichannel Communication Templates & 1-Click Booking Link Generator (DOMAIN: RECALLS)
 *
 * Персонализированные шаблоны для WhatsApp, Telegram, SMS и телефонных скриптов администратора.
 * Соответствует ФЗ «О рекламе» ст. 18 ч. 1, принципам клинической деонтологии и юридическим стандартам клиники.
 */

export {
	extractPolitePatientName,
	generatePdnProtectedRecallMessage,
	extractFirstName,
	sanitizePhoneNumber,
	calculateSmsSegments,
	formatSmsSummary,
	buildWhatsAppUrl,
	buildTelegramUrl,
	type SmsSegmentCalculation,
} from "./patientRecallEngine";

export type { RecallTemplateVariables } from "./recallCycleCatalog";
export {
	generate1ClickBookingLink,
	interpolateRecallTemplate,
	generateWhatsAppRecallMessage,
	generateTelegramRecallMessage,
	generateSmsRecallMessage,
	sendRecallCandidateInvite,
	type RecallInviteRequest,
	type RecallInviteResponse,
} from "./recallSmsAndMessaging";

export type {
	RecallScriptObjection,
	RecallCallingScript,
} from "./recallCallingScriptTypes";

export { CLINICAL_CALLING_SCRIPTS } from "./recallCallingScriptsCatalog";
