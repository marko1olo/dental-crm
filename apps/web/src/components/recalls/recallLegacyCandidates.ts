import type { PatientRecallItem } from "./recallLegacyCandidatesTypes";
import {
	extractFirstName,
	sanitizePhoneNumber,
} from "./recallSmsAndMessaging";

export type {
	RecallCategoryFilter,
	RecallUrgencyLevel,
	RecallChannelType,
	PatientRecallItem,
} from "./recallLegacyCandidatesTypes";

export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallItem[] = [];

export const extractPatientFirstName = extractFirstName;
export const cleanPhoneDigits = sanitizePhoneNumber;

export { buildRecallMessageContent } from "./recallLegacyMessageFormatter";
