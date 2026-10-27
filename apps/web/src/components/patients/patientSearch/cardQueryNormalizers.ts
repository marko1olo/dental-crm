/**
 * cardQueryNormalizers.ts — Layer 0: Экстракторы и нормализаторы номеров карт и телефонов
 */

import type { PatientSearchableFields } from "./types";

/**
 * Извлекает все варианты номеров медицинских карт пациента (chartNumber, cardNumber и т.д.)
 */
export function extractPatientCardNumbers(
	patient: PatientSearchableFields | null | undefined,
): string[] {
	if (!patient) return [];
	const rawList = [
		patient.cardNumber,
		patient.chartNumber,
		patient.medicalCardNumber,
		patient.medCardNumber,
		patient.administrativeProfile?.cardNumber,
	].filter((c): c is string => Boolean(c && typeof c === "string" && c.trim().length > 0));

	return Array.from(new Set(rawList.map((c) => c.trim())));
}

/**
 * Извлекает все телефонные номера пациента из различных профилей и полей.
 */
export function extractPatientPhones(
	patient: PatientSearchableFields | null | undefined,
): string[] {
	if (!patient) return [];
	const rawList = [
		patient.phone,
		patient.mobilePhone,
		patient.contactPhone,
		patient.administrativeProfile?.patientPhone,
	].filter((p): p is string => Boolean(p && typeof p === "string" && p.trim().length > 0));

	return Array.from(new Set(rawList.map((p) => p.trim())));
}

/**
 * Очищает поисковый запрос от префиксов медкарты («форма 043», «043/у», «карта», «№» и др.)
 */
export function normalizeCardQuery(rawQuery: string): {
	isCardExplicit: boolean;
	cleanCardToken: string;
	cardDigits: string;
} {
	const trimmed = rawQuery.trim();
	const lower = trimmed.toLowerCase().replaceAll("ё", "е");

	const hasCardPrefix =
		/^(форма\s+)?(043[\s/\\_-]*[уy]?|ф\.?\s*043[\s/\\_-]*[уy]?)/i.test(lower) ||
		/^(медкарта|карточка|карта|мед\.?\s*карта)\s*(№|n|#)?/i.test(lower) ||
		/^(№|n|#)\s*/i.test(lower) ||
		/^[кk][-_\s]\d+/i.test(lower);

	let cleaned = lower;
	cleaned = cleaned.replace(/^(форма\s+)?(043[\s/\\_-]*[уy]?|ф\.?\s*043[\s/\\_-]*[уy]?)\s*[-_\s]*/i, "");
	cleaned = cleaned.replace(/^(медкарта|карточка|карта|мед\.?\s*карта)\s*(№|n|#)?\s*[-_\s]*/i, "");
	cleaned = cleaned.replace(/^(№|n|#)\s*/i, "");

	const cardDigits = cleaned.replace(/\D/g, "");

	return {
		isCardExplicit: hasCardPrefix,
		cleanCardToken: cleaned.trim(),
		cardDigits,
	};
}
