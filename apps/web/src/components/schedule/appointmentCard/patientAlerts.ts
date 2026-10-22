import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";

/**
 * Resolves patient 54-FZ balance as a numeric value.
 */
export function resolvePatientBalance(
	patient?: { balanceRub?: number | string | null; balance?: number | string | null } | null,
): number | null {
	if (!patient) return null;
	const raw = patient.balanceRub ?? patient.balance;
	if (raw === undefined || raw === null || raw === "") return null;
	const num = Number(raw);
	return Number.isFinite(num) ? num : null;
}

/**
 * Extracts patient allergy alert string, respecting negative statements ("нет аллергий").
 */
export function getPatientAllergyAlert(
	patient?: any,
	reason?: string | null,
): string | null {
	if (!patient && !reason) return null;
	const rawAllergies = patient?.allergies || patient?.anamnesis?.allergies;
	if (Array.isArray(rawAllergies) && rawAllergies.length > 0) {
		const joined = rawAllergies.filter(Boolean).join(", ");
		if (joined && !isNegativeAllergyStatement(joined)) {
			return `Внимание: ${joined}`;
		}
	}
	if (
		rawAllergies &&
		typeof rawAllergies === "string" &&
		rawAllergies.trim() &&
		!isNegativeAllergyStatement(rawAllergies)
	) {
		return `Внимание: ${rawAllergies.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/аллерги[яеи][^.;\n]*/i);
	if (match && !isNegativeAllergyStatement(match[0])) {
		return `Внимание: ${match[0].trim()}`;
	}
	const r = reason || "";
	if (
		(/лидокаин/i.test(r) || /аллерги/i.test(r)) &&
		!isNegativeAllergyStatement(r)
	) {
		return "Внимание: Аллергия на лидокаин";
	}
	return null;
}

/**
 * Extracts patient somatic alert (chronic diseases, cardiovascular, diabetes, etc.).
 */
export function getPatientSomaticAlert(patient?: any): string | null {
	if (!patient) return null;
	const chronic = patient?.anamnesis?.chronicDiseases || patient?.chronicDiseases;
	if (chronic && typeof chronic === "string" && chronic.trim()) {
		return `Соматика: ${chronic.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/(диабет|гипертони[яеи]|астм[аеы]|онколог|кардио|сердечн|гепатит|эпилепси)[^.;\n]*/i);
	if (match) {
		return `Соматика: ${match[0].trim()}`;
	}
	return null;
}
