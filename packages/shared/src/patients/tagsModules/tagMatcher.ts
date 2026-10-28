import { type PatientTagCode, type PatientTagMeta, PATIENT_TAGS_CATALOG } from "./tagDefinitions.js";

export function patientHasTag(
	tags: readonly (string | PatientTagCode)[] | null | undefined,
	target: PatientTagCode | string,
): boolean {
	if (!tags || tags.length === 0) return false;
	return tags.includes(target as PatientTagCode);
}

export function patientHasAnyTag(
	tags: readonly (string | PatientTagCode)[] | null | undefined,
	targets: readonly (PatientTagCode | string)[],
): boolean {
	if (!tags || tags.length === 0 || targets.length === 0) return false;
	return targets.some((t) => tags.includes(t as PatientTagCode));
}

export function patientHasAllTags(
	tags: readonly (string | PatientTagCode)[] | null | undefined,
	targets: readonly (PatientTagCode | string)[],
): boolean {
	if (targets.length === 0) return true;
	if (!tags || tags.length === 0) return false;
	return targets.every((t) => tags.includes(t as PatientTagCode));
}

export function filterPatientsByTags<T extends { tags?: readonly string[] | null }>(
	patients: readonly T[],
	filterTags: readonly string[],
	matchMode: "any" | "all" = "any",
): T[] {
	if (filterTags.length === 0) return [...patients];
	return patients.filter((p) => {
		const ptTags = p.tags ?? [];
		return matchMode === "all"
			? patientHasAllTags(ptTags, filterTags)
			: patientHasAnyTag(ptTags, filterTags);
	});
}

export function searchPatientTags(query: string): PatientTagMeta[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [...PATIENT_TAGS_CATALOG];
	return PATIENT_TAGS_CATALOG.filter(
		(tag) =>
			tag.code.toLowerCase().includes(trimmed) ||
			tag.labelRu.toLowerCase().includes(trimmed) ||
			tag.descriptionRu.toLowerCase().includes(trimmed),
	);
}
