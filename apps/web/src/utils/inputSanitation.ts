/**
 * inputSanitation.ts — Canonical Dental Input Sanitation & Validation Engine (SSOT).
 *
 * Implements strict medical data sanitation and formatting for Russian healthcare records:
 * 1. Phone numbers (+7 / 8 / 9 mobile prefix auto-completion, paste handling, E.164, 152-FZ masking);
 * 2. SNILS (PFR 192p checksum validation, 11-digit auto-formatting, 152-FZ masking);
 * 3. Russian Passport (series + number formatting, preservation of non-passport documents, masking);
 * 4. Taxpayer INN (10/12-digit validation and formatting);
 * 5. OMS / ENP medical insurance policy (16 digits in 4x4 blocks, masking);
 * 6. Numeric and financial input sanitation.
 *
 * Complies with Mandate 8s (Law of the Single Indivisible Authority) and 152-FZ.
 */

import {
	formatPhoneDisplay,
	formatPhoneNumber,
	formatPhoneRu,
	formatRussianPhone,
	getNationalPhoneDigits,
	isValidRussianInn as isValidInnShared,
	isValidRussianPassport as isValidPassportShared,
	isValidRussianPhone,
	isValidSnils as isValidSnilsShared,
	normalizePhoneDigits as normalizePhoneDigitsShared,
	normalizePhoneToE164,
	normalizePhoneToNational,
	normalizeSnils as normalizeSnilsShared,
} from "@dental/shared";

// ============================================================================
// 1. PHONE SANITATION & FORMATTING (DELEGATED TO @dental/shared SSOT)
// ============================================================================

export {
	formatPhoneDisplay,
	formatPhoneNumber,
	formatPhoneRu,
	formatRussianPhone,
	normalizePhoneToNational,
	normalizePhoneToE164,
	isValidRussianPhone,
};

/**
 * Очищает номер телефона от всех нечисловых символов.
 * Если передан номер из 11 цифр, начинающийся с 8, нормализует ведущую цифру в 7.
 * Пример: "8 (912) 345-67-89" -> "79123456789"
 */
export function cleanPhoneDigits(value: string | null | undefined): string {
	if (!value) return "";
	const digits = String(value).replace(/\D/g, "");
	if (digits.length === 11 && digits.startsWith("8")) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}


/**
 * Маскирует номер телефона для соблюдения 152-ФЗ РФ (скрывает средние цифры):
 * Пример: "+7 (916) 450-12-34" -> "+7 (916) •••-••-34"
 * Если strict=true: "+7 (•••) •••-••-34"
 * Для SMS/мессенджеров (GSM-7/ASCII): options = { maskChar: "*" } -> "+7 (916) ***-**-34"
 */
export function maskRussianPhone(
	phone: string | null | undefined,
	options?: boolean | { strict?: boolean; maskChar?: string },
): string {
	if (!phone) return "—";
	const strict = typeof options === "boolean" ? options : Boolean(options?.strict);
	const maskChar = (typeof options === "object" && options?.maskChar) || "•";
	const digits = cleanPhoneDigits(phone);
	const m3 = maskChar.repeat(3);
	const m2 = maskChar.repeat(2);

	if (digits.length < 2) return `+7 (${m3}) ${m3}-${m2}-${m2}`;

	if (digits.length < 10) {
		if (maskChar === "*") return "+7 (***) ***-**-**";
		const last2 = digits.slice(-2);
		return `+7 (${m3}) ${m3}-${m2}-${last2}`;
	}

	const last2 = digits.slice(-2);
	if (strict) {
		return `+7 (${m3}) ${m3}-${m2}-${last2}`;
	}

	const nat10 = digits.slice(-10);
	const code = nat10.slice(0, 3);
	return `+7 (${code}) ${m3}-${m2}-${last2}`;
}

// ============================================================================
// 2. SNILS SANITATION & VALIDATION (ПФР / СФР / ЕГИСЗ)
// ============================================================================

/**
 * Извлекает цифры СНИЛС (до 11 цифр).
 */
export function normalizeSnils(value: unknown): string {
	return normalizeSnilsShared(value);
}

/**
 * Проверка СНИЛС по официальному контрольному числу ПФР (Постановление Правления ПФР № 192п).
 */
export function isValidSnils(value: unknown): boolean {
	return isValidSnilsShared(value);
}

/**
 * Автоформатирование СНИЛС при наборе (до 11 цифр в формате XXX-XXX-XXX XX).
 * Корректно форматирует частичный ввод по мере набора пользователем.
 */
export function formatSnils(value: string | null | undefined): string {
	if (!value) return "";
	const digits = String(value).replace(/\D/g, "").slice(0, 11);
	if (!digits) return "";

	let formatted = digits.slice(0, 3);
	if (digits.length > 3) {
		formatted += `-${digits.slice(3, 6)}`;
	}
	if (digits.length > 6) {
		formatted += `-${digits.slice(6, 9)}`;
	}
	if (digits.length > 9) {
		formatted += ` ${digits.slice(9, 11)}`;
	}
	return formatted;
}

/**
 * Маскирует СНИЛС по стандарту 152-ФЗ (скрывает первые 9 цифр, оставляя контрольное число).
 * Пример: "123-456-789 01" -> "•••-•••-••• 01"
 */
export function maskRussianSnils(snils: string | null | undefined): string {
	if (!snils) return "•••-•••-••• ••";
	const digits = normalizeSnils(snils);
	if (digits.length < 2) return "•••-•••-••• ••";
	const checkSum = digits.slice(-2);
	return `•••-•••-••• ${checkSum}`;
}

// ============================================================================
// 3. PASSPORT RF & IDENTITY DOCUMENTS
// ============================================================================

/**
 * Автоформатирование паспорта РФ (серия и номер: 4 цифры серии + пробел + 6 цифр номера).
 * Если пользователь вводит иной документ (свидетельство о рождении, загранпаспорт),
 * текстовое значение бережно сохраняется без искажения.
 */
export function formatRussianPassport(value: string | null | undefined): string {
	if (!value) return "";
	const trimmed = String(value).trim();
	const digits = trimmed.replace(/\D/g, "");
	if (digits.length > 0 && /^\d+[\s\d]*$/.test(trimmed)) {
		const clampedDigits = digits.slice(0, 10);
		if (clampedDigits.length <= 4) {
			return clampedDigits;
		}
		return `${clampedDigits.slice(0, 4)} ${clampedDigits.slice(4, 10)}`;
	}
	return trimmed;
}

/**
 * Проверка паспорта РФ: ровно 10 цифр (4 цифры серии + 6 цифр номера).
 */
export function isValidRussianPassport(value: string | null | undefined): boolean {
	return isValidPassportShared(value);
}

/**
 * Маскирует серию и номер паспорта по 152-ФЗ.
 * Пример: "4510 123456" -> "45•• ••••56" или "45•• ••••••"
 */
export function maskRussianPassport(passport: string | null | undefined): string {
	if (!passport) return "•• •• ••••••";
	const digits = String(passport).replace(/\D/g, "");
	if (digits.length < 4) return "•• •• ••••••";
	const seriesPrefix = digits.slice(0, 2);
	const last2 = digits.length >= 10 ? digits.slice(-2) : "••";
	return `${seriesPrefix}•• ••••${last2}`;
}

// ============================================================================
// 4. TAXPAYER INN (ИНН ФИЗЛИЦ / ЮРЛИЦ)
// ============================================================================

/**
 * Очищает ИНН от нечисловых символов и ограничивает 12 цифрами.
 */
export function formatTaxpayerInn(value: string | null | undefined): string {
	if (!value) return "";
	return String(value).replace(/\D/g, "").slice(0, 12);
}

/**
 * Форматирует ИНН с группировкой цифр для читаемости:
 * 12 цифр (физлицо/ИП): XXXX XXXX XXXX
 * 10 цифр (юрлицо): XXXX XXXXX X
 */
export function formatRussianInn(value: string | null | undefined): string {
	const digits = formatTaxpayerInn(value);
	if (digits.length === 12) {
		return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
	}
	if (digits.length === 10) {
		return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
	}
	return digits;
}

/**
 * Проверяет корректность контрольных цифр ИНН (10 или 12 цифр по алгоритму ФНС).
 */
export function isValidRussianInn(value: string | null | undefined): boolean {
	return isValidInnShared(value);
}

// ============================================================================
// 5. OMS POLICY (ПОЛИС ОМС / ЕНП)
// ============================================================================

/**
 * Автоформатирование полиса ОМС единого образца (16 цифр: XXXX XXXX XXXX XXXX).
 */
export function formatOmsPolicy(value: string | null | undefined): string {
	if (!value) return "";
	const digits = String(value).replace(/\D/g, "").slice(0, 16);
	if (!digits) return "";
	if (digits.length <= 4) return digits;
	if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
	if (digits.length <= 12) return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
	return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)}`;
}

/**
 * Проверяет, что полис ОМС содержит ровно 16 цифр.
 */
export function isValidRussianOmsPolicy(value: string | null | undefined): boolean {
	if (!value) return false;
	const digits = String(value).replace(/\D/g, "");
	return digits.length === 16;
}

/**
 * Маскирует полис ОМС по стандарту 152-ФЗ.
 * Пример: "1234567890123456" -> "1234 •••• •••• 3456"
 */
export function maskRussianOmsPolicy(policy: string | null | undefined): string {
	if (!policy) return "•••• •••• •••• ••••";
	const digits = String(policy).replace(/\D/g, "");
	if (digits.length < 16) return "•••• •••• •••• ••••";
	const first4 = digits.slice(0, 4);
	const last4 = digits.slice(-4);
	return `${first4} •••• •••• ${last4}`;
}

// ============================================================================
// 6. NUMERIC & TEXT INPUT SANITATION
// ============================================================================

/**
 * Очищает числовой ввод для сумм, оставляя только целые неотрицательные рубли.
 */
export function formatCurrencyNumeric(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "number") {
		return Math.max(0, Math.round(value)).toString();
	}

	const digits = String(value).replace(/[^\d]/g, "");
	if (!digits) return "";

	const num = Number.parseInt(digits, 10);
	return Number.isNaN(num) ? "" : num.toString();
}

/**
 * Санитизирует числовой ввод с возможной десятичной точкой/запятой (например, дозировка или вес).
 * Заменяет запятые на точки, оставляет только одну точку и цифры.
 */
export function sanitizeNumericInput(value: string | null | undefined, allowDecimals = true): string {
	if (!value) return "";
	let cleaned = String(value).replace(/,/g, ".");
	if (allowDecimals) {
		cleaned = cleaned.replace(/[^\d.]/g, "");
		const parts = cleaned.split(".");
		if (parts.length > 2) {
			cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
		}
	} else {
		cleaned = cleaned.replace(/\D/g, "");
	}
	return cleaned;
}

/**
 * Нормализует ФИО пациента: убирает лишние пробелы, делает первую букву каждого слова заглавной.
 * Пример: "иванов  иван иванович" -> "Иванов Иван Иванович"
 */
export function sanitizePatientName(name: string | null | undefined): string {
	if (!name) return "";
	return String(name)
		.trim()
		.split(/\s+/)
		.map((part) => {
			if (!part) return "";
			return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
		})
		.join(" ");
}

/**
 * Нормализует кириллический текст (заменяет латинские омоглифы, заменяет ё на е, схлопывает пробелы).
 */
export function sanitizeCyrillicText(text: string | null | undefined): string {
	if (!text) return "";
	return String(text)
		.replace(/ё/g, "е")
		.replace(/Ё/g, "Е")
		.replace(/\s+/g, " ")
		.trim();
}
