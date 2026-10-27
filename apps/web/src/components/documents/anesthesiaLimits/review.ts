import type { AnesthesiaTextLimit, AnesthesiaTextLimitsInput, AnesthesiaTextLimitsReview } from "./types";
import {
	payloadShape,
	doseRowShape,
	limitOf,
	vasoconstrictorLimit,
	restrictionNotesLimit,
	reactionLimit,
	ANESTHESIA_MEDICATION_JOIN_LIMIT,
	trimmedLength,
	anesthesiaMedicationJoin,
} from "./constants";

export function anesthesiaTextLimitsReview(
	_input: AnesthesiaTextLimitsInput,
): AnesthesiaTextLimitsReview {
	// Мандат 8e и 8n: Врач лечит зубы, а не борется с лимитами символов в бланках.
	// Никаких блокирующих ошибок и аутистических предупреждений «Журнал не создастся».
	return { tooLong: [] };
}
