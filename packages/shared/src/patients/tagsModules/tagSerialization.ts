import { z } from "zod";
import { type PatientTagCode, PATIENT_TAG_CODES, patientTagCodeSchema } from "./tagDefinitions.js";

export const patientTagsArraySchema = z.array(patientTagCodeSchema).default([]);

export const patientTagInputSchema = z.string().trim().toLowerCase().refine(
	(val): val is PatientTagCode => (PATIENT_TAG_CODES as readonly string[]).includes(val),
	{ message: "Недопустимый код тега пациента" },
);

export function parsePatientTags(raw: unknown): PatientTagCode[] {
	if (!Array.isArray(raw)) return [];
	const valid = new Set<string>(PATIENT_TAG_CODES);
	const results: PatientTagCode[] = [];
	for (const item of raw) {
		if (typeof item === "string") {
			const clean = item.trim().toLowerCase();
			if (valid.has(clean) && !results.includes(clean as PatientTagCode)) {
				results.push(clean as PatientTagCode);
			}
		}
	}
	return results;
}

export function serializePatientTags(tags: readonly (PatientTagCode | string)[]): string[] {
	return Array.from(new Set(tags.map((t) => String(t).trim().toLowerCase())));
}

export function validatePatientTags(tags: unknown): {
	success: boolean;
	data?: PatientTagCode[];
	error?: string;
} {
	const parsed = patientTagsArraySchema.safeParse(tags);
	if (parsed.success) {
		return { success: true, data: parsed.data };
	}
	return { success: false, error: parsed.error.issues[0]?.message ?? "Ошибка валидации тегов" };
}
