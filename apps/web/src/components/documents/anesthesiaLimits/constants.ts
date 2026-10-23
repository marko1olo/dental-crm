import {
	anesthesiaConsentPayloadSchema,
	anesthesiaDoseRowSchema,
} from "@dental/shared";

export const payloadShape = anesthesiaConsentPayloadSchema.shape;
export const doseRowShape = anesthesiaDoseRowSchema.shape;

export function limitOf(schema: { maxLength: number | null }): number | null {
	return schema.maxLength;
}

export const vasoconstrictorLimit = limitOf(
	payloadShape.vasoconstrictor.unwrap().unwrap(),
);
export const restrictionNotesLimit = limitOf(
	payloadShape.restrictionNotes.unwrap().unwrap(),
);
export const reactionLimit = limitOf(doseRowShape.reaction.unwrap().unwrap());

export const ANESTHESIA_MEDICATION_JOIN_LIMIT = limitOf(
	doseRowShape.medication,
);

const MEDICATION_JOIN_SEPARATOR = ", ";

export function trimmedLength(value: string): number {
	return String(value ?? "").trim().length;
}

export function anesthesiaMedicationJoin(
	anesthetic: string,
	vasoconstrictor: string,
): string {
	return [String(anesthetic ?? "").trim(), String(vasoconstrictor ?? "").trim()]
		.filter(Boolean)
		.join(MEDICATION_JOIN_SEPARATOR);
}
