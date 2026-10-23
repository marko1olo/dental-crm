/**
 * Anesthesia Text Limits Facade
 * Decomposed per Mandate 8b (file length <= 120 lines).
 */
export type {
	AnesthesiaTextLimit,
	AnesthesiaTextLimitsReview,
	AnesthesiaTextLimitsInput,
} from "./anesthesiaLimits";

export {
	ANESTHESIA_MEDICATION_JOIN_LIMIT,
	anesthesiaMedicationJoin,
	anesthesiaTextLimitsReview,
} from "./anesthesiaLimits";
