/**
 * Omnichannel Communication Templates & 1-Click Booking Link Generator (DOMAIN: RECALLS)
 * Mandate 8b (<= 120 lines), Mandate 8x (Human Clinical Language)
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
	RecallInvitationTemplate,
	RecallCallingScript,
} from "./recallInvitationTemplates";

export {
	INVITATION_TEMPLATES,
	CLINICAL_CALLING_SCRIPTS,
} from "./recallInvitationTemplates";
