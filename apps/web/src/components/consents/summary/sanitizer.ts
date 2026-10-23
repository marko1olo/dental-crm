import type { ConsentSubstitutionContext } from "../consentTemplates.js";
import { STATUTORY_CONSENT_KEY_LABELS } from "../consentSsotEngine.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

/**
 * Очищает значение поля документа от системного мусора (null, undefined, id: 804n-undefined, NaN).
 */
export function sanitizeConsentFieldValue(value: string | null | undefined, fallback = "—"): string {
	if (value === null || value === undefined) {
		return fallback;
	}
	let str = String(value).trim();
	if (!str) return fallback;

	// Проверка на строковые артефакты JavaScript
	if (
		str === "null" ||
		str === "undefined" ||
		str === "NaN" ||
		str === "[object Object]" ||
		str.toLowerCase() === "undefined" ||
		str.toLowerCase() === "null"
	) {
		return fallback;
	}

	// Очистка от сырых префиксов 804н и системных ID
	if (/^id:\s*804n-undefined$/i.test(str) || /^804n-undefined$/i.test(str)) {
		return "По клиническим показаниям (Приказ Минздрава РФ № 1051н)";
	}

	str = str.replace(/\bid:\s*804n-undefined\b/gi, "клинические показания");
	str = str.replace(/\b804n-undefined\b/gi, "клинические стандарты");
	str = str.replace(/\bundefined\b/g, fallback);
	str = str.replace(/\bnull\b/g, fallback);

	// Перевод английских ключей в официальную русскую терминологию
	const statutoryLabel = (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[str];
	if (statutoryLabel) {
		return statutoryLabel;
	}

	return str;
}

/**
 * Очищает произвольный текст бланка ИДС от системного мусора и заменяет английские коды на русский язык.
 */
export function cleanPrintableConsentText(text: string): string {
	if (!text) return "";
	let cleaned = text;

	for (const [key, label] of Object.entries(STATUTORY_CONSENT_KEY_LABELS)) {
		const regex = new RegExp(`\\b${key}\\b`, "g");
		cleaned = cleaned.replace(regex, label);
	}

	cleaned = cleaned.replace(/\bid:\s*804n-undefined\b/gi, "Медицинская услуга по номенклатуре");
	cleaned = cleaned.replace(/\b804n-undefined\b/gi, "По клиническим стандартам");
	cleaned = cleaned.replace(/\bundefined\b/g, "—");
	cleaned = cleaned.replace(/\bnull\b/g, "—");
	cleaned = cleaned.replace(/\bNaN\b/g, "—");
	cleaned = cleaned.replace(/\[object Object\]/g, "—");

	return cleaned;
}

/**
 * Валидирует и нормализует контекст подстановки, гарантируя отсутствие мусора в распечатываемом бланке.
 */
export function sanitizeConsentContext(context: ConsentSubstitutionContext): ConsentSubstitutionContext {
	const isDemo = isDemoShowcaseMode();
	return {
		patientName: sanitizeConsentFieldValue(context.patientName, "________________________________________"),
		birthDate: sanitizeConsentFieldValue(context.birthDate, "«___» _________ _____ г."),
		passport: sanitizeConsentFieldValue(context.passport, "серия ______ № ________ выдан ____________________"),
		doctorName: sanitizeConsentFieldValue(context.doctorName, "Лечащий врач-стоматолог"),
		clinicName: sanitizeConsentFieldValue(context.clinicName, isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicLegalName: sanitizeConsentFieldValue(context.clinicLegalName, isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicAddress: sanitizeConsentFieldValue(context.clinicAddress, isDemo ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
		clinicOgrn: sanitizeConsentFieldValue(context.clinicOgrn, isDemo ? "1217700123456" : "«________________»"),
		licenseNumber: sanitizeConsentFieldValue(context.licenseNumber, isDemo ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
		diagnosisIcd: sanitizeConsentFieldValue(context.diagnosisIcd, isDemo ? "Первичный осмотр и обследование" : "________________________________________"),
		toothNumbers: sanitizeConsentFieldValue(context.toothNumbers, isDemo ? "Полость рта (зубной ряд)" : "________________________"),
		date: sanitizeConsentFieldValue(context.date, new Date().toLocaleDateString("ru-RU")),
		snils: sanitizeConsentFieldValue(context.snils, "___-___-___ __"),
		phone: sanitizeConsentFieldValue(context.phone, "+7 (___) ___-__-__"),
		guardianName: context.guardianName ? sanitizeConsentFieldValue(context.guardianName, "") : undefined,
		guardianRelation: context.guardianRelation ? sanitizeConsentFieldValue(context.guardianRelation, "") : undefined,
		guardianDocument: context.guardianDocument ? sanitizeConsentFieldValue(context.guardianDocument, "") : undefined,
		guardianPhone: context.guardianPhone ? sanitizeConsentFieldValue(context.guardianPhone, "") : undefined,
		patientAgeYears: context.patientAgeYears,
	};
}
