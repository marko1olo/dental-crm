/**
 * stringNormalizers.ts — Layer 0: Нормализаторы строк, телефонов, карт и транслитерации.
 */

import { getNationalPhoneDigits } from "@dental/shared";
import type { PatientSearchableFields } from "./types";

// ============================================================================
// 1. ТЕЛЕФОННАЯ НОРМАЛИЗАЦИЯ (E.164 И 10-ЗНАЧНЫЙ НАЦИОНАЛЬНЫЙ ФОРМАТ)
// ============================================================================

/**
 * Нормализует телефонный номер к каноническому 10-значному национальному представлению (без кода страны).
 * Поддерживает форматы: +79991234567, 89991234567, 9991234567, +7 (999) 123-45-67 -> "9991234567"
 */
export const normalizePhoneToNational = (value: string | null | undefined): string =>
	getNationalPhoneDigits(value);

/**
 * Нормализует телефонный номер к международному формату E.164 (+7XXXXXXXXXX для РФ).
 */
export function normalizePhoneE164(value: string | null | undefined): string {
	const national = normalizePhoneToNational(value);
	if (national.length === 10) {
		return `+7${national}`;
	}
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length >= 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1, 11)}`;
	}
	if (digits.length === 10) {
		return `+7${digits}`;
	}
	return digits ? `+${digits}` : "";
}

// ============================================================================
// 2. ТРАНСЛИТЕРАЦИЯ И КОНВЕРТАЦИЯ РАСКЛАДКИ КЛАВИАТУРЫ
// ============================================================================

const LATIN_TO_CYRILLIC_MULTI: readonly [string, string][] = [
	["shch", "щ"],
	["sh", "ш"],
	["ch", "ч"],
	["zh", "ж"],
	["ts", "ц"],
	["tc", "ц"],
	["kh", "х"],
	["yu", "ю"],
	["ju", "ю"],
	["ya", "я"],
	["ja", "я"],
	["yo", "ё"],
	["jo", "ё"],
	["oy", "ой"],
	["ay", "ай"],
	["ey", "ей"],
	["uy", "уй"],
	["iy", "ий"],
	["yy", "ый"],
];

const LATIN_TO_CYRILLIC_SINGLE: Record<string, string> = {
	a: "а",
	b: "б",
	c: "к",
	d: "д",
	e: "е",
	f: "ф",
	g: "г",
	h: "х",
	i: "и",
	j: "й",
	k: "к",
	l: "л",
	m: "м",
	n: "н",
	o: "о",
	p: "п",
	q: "к",
	r: "р",
	s: "с",
	t: "т",
	u: "у",
	v: "в",
	w: "в",
	x: "кс",
	y: "ы",
	z: "з",
};

/**
 * Транслитерация из латиницы в кириллицу (Ivanov -> Иванов, Shcherbakov -> Щербаков, Kuznetsov -> Кузнецов)
 */
export function transliterateLatinToCyrillic(text: string): string {
	if (!text) return "";
	let lower = text.toLowerCase();

	// 1. Многобуквенные сочетания
	for (const [latin, cyr] of LATIN_TO_CYRILLIC_MULTI) {
		lower = lower.replaceAll(latin, cyr);
	}

	// 2. Однобуквенные замены
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		if (char && LATIN_TO_CYRILLIC_SINGLE[char]) {
			result += LATIN_TO_CYRILLIC_SINGLE[char];
		} else {
			result += char;
		}
	}
	return result;
}

const QWERTY_TO_JCUKEN: Record<string, string> = {
	q: "й",
	w: "ц",
	e: "у",
	r: "к",
	t: "е",
	y: "н",
	u: "г",
	i: "ш",
	o: "щ",
	p: "з",
	"[": "х",
	"]": "ъ",
	a: "ф",
	s: "ы",
	d: "в",
	f: "а",
	g: "п",
	h: "р",
	j: "о",
	k: "л",
	l: "д",
	";": "ж",
	"'": "э",
	z: "я",
	x: "ч",
	c: "с",
	v: "м",
	b: "и",
	n: "т",
	m: "ь",
	",": "б",
	".": "ю",
};

/**
 * Конвертирует ошибочный ввод в неверной раскладке клавиатуры (Bdfyjd -> иванов, Cvshpyst -> смирнов)
 */
export function convertKeyboardMistype(text: string): string {
	if (!text) return "";
	const lower = text.toLowerCase();
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		if (char && QWERTY_TO_JCUKEN[char]) {
			result += QWERTY_TO_JCUKEN[char];
		} else {
			result += char;
		}
	}
	return result;
}

/**
 * Нормализует кириллический текст (нижний регистр, замена Ё на Е, очистка знаков)
 */
export function normalizeCyrillicText(value: string | null | undefined): string {
	return (value ?? "")
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

// ============================================================================
// 3. ЭКСТРАКТОРЫ И ОЧИСТКА МЕДКАРТ И ТЕЛЕФОНОВ
// ============================================================================

/**
 * Извлекает все варианты номеров медицинских карт пациента (043/у, chartNumber, cardNumber и т.д.)
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
 * Очищает поисковый запрос от префиксов медкарты 043/у («форма 043», «043/у», «карта», «№» и др.)
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
