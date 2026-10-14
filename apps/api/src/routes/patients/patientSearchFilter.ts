import {
	convertQwertyMistype,
	phoneKey,
	transliterateLatinToCyrillic,
} from "../../services/patients/duplicateDetection.js";

/**
 * Фильтрация массива пациентов по поисковому запросу с учетом опечаток QWERTY,
 * транслитерации и нормализации телефонных номеров.
 */
export function filterPatientsBySearchQuery<T extends { fullName?: unknown; phone?: unknown; email?: unknown }>(
	patients: T[],
	searchRaw: string
): T[] {
	if (!searchRaw) return patients;
	const qLower = searchRaw.toLowerCase();
	const qwertySearch = convertQwertyMistype(qLower);
	const translitSearch = transliterateLatinToCyrillic(qLower);
	const searchDigits = qLower.replace(/\D/g, "");
	const searchPk = phoneKey(qLower);

	return patients.filter((p) => {
		const nameStr = typeof p.fullName === "string" ? p.fullName : "";
		const nameLower = nameStr.toLowerCase();
		const nameMatch =
			nameLower.includes(qLower) ||
			(qwertySearch !== qLower && nameLower.includes(qwertySearch)) ||
			(translitSearch !== qLower && nameLower.includes(translitSearch));

		const pPhone = typeof p.phone === "string" ? p.phone : "";
		const phoneDigits = pPhone.replace(/\D/g, "");
		const phonePk = phoneKey(pPhone);
		const phoneMatch =
			pPhone.toLowerCase().includes(qLower) ||
			(searchDigits.length >= 4 && phoneDigits.includes(searchDigits)) ||
			(searchPk !== null && phonePk !== null && searchPk === phonePk);

		const pEmail = typeof p.email === "string" ? p.email : "";
		const emailMatch = pEmail.toLowerCase().includes(qLower);
		return Boolean(nameMatch || phoneMatch || emailMatch);
	});
}
