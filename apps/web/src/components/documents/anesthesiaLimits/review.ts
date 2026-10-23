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
	input: AnesthesiaTextLimitsInput,
): AnesthesiaTextLimitsReview {
	const medicationJoin = anesthesiaMedicationJoin(
		input.anesthetic,
		input.vasoconstrictor,
	);

	const candidates: Array<{
		field: string;
		label: string;
		limit: number | null;
		length: number;
	}> = [
		{
			field: "anesthesiaMethod",
			label: "Метод",
			limit: limitOf(payloadShape.method),
			length: trimmedLength(input.method),
		},
		{
			field: "anesthesiaAnesthetic",
			label: "Препарат",
			limit: limitOf(payloadShape.anesthetic),
			length: trimmedLength(input.anesthetic),
		},
		{
			field: "anesthesiaVasoconstrictor",
			label: "Вазоконстриктор",
			limit: vasoconstrictorLimit,
			length: trimmedLength(input.vasoconstrictor),
		},
		{
			field: "anesthesiaMedicationJoin",
			label: "Препарат и вазоконстриктор вместе",
			limit: ANESTHESIA_MEDICATION_JOIN_LIMIT,
			length: medicationJoin.length,
		},
		{
			field: "anesthesiaZone",
			label: "Зона",
			limit: limitOf(payloadShape.plannedZone),
			length: trimmedLength(input.zone),
		},
		{
			field: "anesthesiaAllergyStatus",
			label: "Аллергоанамнез",
			limit: limitOf(payloadShape.allergyStatus),
			length: trimmedLength(input.allergyStatus),
		},
		{
			field: "anesthesiaDoseTime",
			label: "Время",
			limit: limitOf(doseRowShape.time),
			length: trimmedLength(input.doseTime),
		},
		{
			field: "anesthesiaDoseMl",
			label: "Доза, мл",
			limit: limitOf(doseRowShape.doseMl),
			length: trimmedLength(input.doseMl),
		},
		{
			field: "anesthesiaReaction",
			label: "Реакция",
			limit: reactionLimit,
			length: trimmedLength(input.reaction),
		},
		{
			field: "anesthesiaRestrictionNotes",
			label: "Ограничения",
			limit: restrictionNotesLimit,
			length: trimmedLength(input.restrictionNotes),
		},
	];

	const tooLong: AnesthesiaTextLimit[] = [];
	for (const candidate of candidates) {
		if (candidate.limit === null) continue;
		if (candidate.length <= candidate.limit) continue;
		tooLong.push({
			field: candidate.field,
			label: candidate.label,
			limit: candidate.limit,
			length: candidate.length,
		});
	}
	return { tooLong };
}
