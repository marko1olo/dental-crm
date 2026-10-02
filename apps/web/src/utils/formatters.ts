/**
 * formatters.ts — Canonical Dental Formatting Engine (Single Source of Truth).
 *
 * Consolidates all UI formatters across DENTE Dental CRM:
 * 1. Currency & Money (exact kopecks, ruble formatting, unknown label defense);
 * 2. Date & Time (GOST DD.MM.YYYY, Russian locales, ISO converters, calendar exports);
 * 3. Phone & Requisites (delegated to inputSanitation.ts SSOT).
 *
 * Fully compliant with Mandate 8b (exact kopeck money), Mandate 8c (density),
 * Mandate 8s (single source of truth), and 152-FZ.
 */

import {
	formatKopecksRu as formatKopecksRuShared,
	formatKopecksToRubles as formatKopecksToRublesShared,
	kopecksToRubles as kopecksToRublesShared,
	rublesToKopecks as rublesToKopecksShared,
} from "@dental/shared";

import {
	formatDateTime,
	formatShortDate,
	formatTime,
	isoDateLabel,
	minutesLabel,
} from "./dateTimeUtils.js";

// Re-export all phone and document input sanitizers from inputSanitation.ts
export * from "./inputSanitation.js";

// ============================================================================
// 1. CURRENCY & MONEY FORMATTING (МАНДАТ 8B: ТОЧНЫЕ РУБЛИ И КОПЕЙКИ)
// ============================================================================

export const moneyUnknownLabel = "не определено";

/**
 * Неразрывный пробел (U+00A0) для разрядов и знака рубля.
 */
export const RU_MONEY_NBSP = " ";

/**
 * Сумма для показа человеку в интерфейсе.
 *
 * Копейки печатаются, только если они есть, и всегда двумя знаками.
 * Круглые суммы не обрастают лишними «,00».
 *
 * Защита от дефекта подмены неизвестного нулём:
 * null, undefined, нечитаемая строка, пустая строка, NaN, Infinity -> "не определено".
 * Настоящий ноль (0) законно печатается как "0 ₽".
 *
 * Поддерживает числа и строки от драйвера PostgreSQL numeric.
 */
export function money(value: number | string | null | undefined): string {
	const amount =
		typeof value === "string"
			? value.trim() === ""
				? Number.NaN
				: Number(value)
			: value;

	if (typeof amount !== "number" || !Number.isFinite(amount) || Number.isNaN(amount)) {
		return moneyUnknownLabel;
	}

	const kopecks = Math.round(amount * 100) % 100;
	const fractionDigits = kopecks === 0 ? 0 : 2;

	return `${amount.toLocaleString("ru-RU", {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	})} ₽`;
}

/**
 * Алиас для money()
 */
export const formatCurrency = money;

/**
 * Форматирует рублевую сумму для отображения. Если значение отсутствует,
 * возвращает безопасный fallback (по умолчанию "0 ₽").
 */
export function formatRubles(
	value: number | string | null | undefined,
	fallback = "0 ₽",
): string {
	const formatted = money(value);
	return formatted === moneyUnknownLabel ? fallback : formatted;
}

/**
 * Форматирует сумму в рублях с копейками строго в стандарте валюты: 1 500,00 ₽.
 * Используется в финансовых актах, реестрах страховых и фискальных чеках.
 */
export function formatCurrencyRu(sumRub: number | string | null | undefined): string {
	const amount =
		typeof sumRub === "string"
			? sumRub.trim() === ""
				? Number.NaN
				: Number(sumRub)
			: sumRub;

	if (typeof amount !== "number" || !Number.isFinite(amount) || Number.isNaN(amount)) {
		return `0,00${RU_MONEY_NBSP}₽`;
	}

	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

/**
 * Форматирует сумму из целочисленных копеек в рубли: 150050 -> "1 500,50 ₽".
 */
export function formatKopecksRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return `0,00${RU_MONEY_NBSP}₽`;
	return formatKopecksRuShared(Math.round(kopecks));
}

/**
 * Форматирует целые копейки в строку рублей с двумя знаками: 150050 -> "1500.50".
 */
export function formatKopecksToRubles(kopecks: number): string {
	return formatKopecksToRublesShared(kopecks);
}

/**
 * Преобразует сумму в рублях в строку с 2 десятичными знаками и знаком рубля: "1 500,50 ₽".
 */
export function formatRublesExactRu(rubles: number): string {
	if (!Number.isFinite(rubles)) return `0,00${RU_MONEY_NBSP}₽`;
	return formatKopecksRu(rublesToKopecks(rubles));
}

/**
 * Перевод рублей в целые копейки с защитой от погрешности IEEE-754.
 */
export function rublesToKopecks(rubles: number): number {
	return rublesToKopecksShared(rubles);
}

/**
 * Перевод копеек в число рублей с плавающей точкой (округление до 2 знаков).
 */
export function kopecksToRubles(kopecks: number): number {
	return kopecksToRublesShared(kopecks);
}

// ============================================================================
// 2. DATE & TIME FORMATTING (ГОСТ И КЛИНИЧЕСКИЙ РУССКИЙ ФОРМАТ)
// ============================================================================

/**
 * Форматирует дату в ГОСТ формат РФ: ДД.ММ.ГГГГ (например, "24.05.2026").
 * Принимает ISO-строку, Date или таймштамп.
 */
export function formatRussianDateGost(
	value: string | Date | number | null | undefined,
): string {
	if (!value) return "—";

	if (typeof value === "string") {
		const trimmed = value.trim();
		// Quick path for ISO date YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const [y, m, d] = trimmed.slice(0, 10).split("-");
			if (y && m && d) return `${d}.${m}.${y}`;
		}
		// Already in RU format DD.MM.YYYY
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			return trimmed;
		}
	}

	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "—";

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}

/**
 * Канонический алиас для даты ГОСТ ДД.ММ.ГГГГ
 */
export const formatDateRu = formatRussianDateGost;

/**
 * Форматирует дату с названием месяца на русском языке: "24 мая 2026 г." или "понедельник, 24 мая 2026 г.".
 */
export function formatRussianDate(
	value: string | Date | number | null | undefined,
	options?: Intl.DateTimeFormatOptions,
): string {
	if (!value) return "—";
	const defaultOptions: Intl.DateTimeFormatOptions = {
		day: "numeric",
		month: "long",
		year: "numeric",
	};

	let dateObj: Date;
	if (typeof value === "string") {
		const trimmed = value.trim();
		const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
		if (match) {
			const y = Number(match[1]);
			const m = Number(match[2]);
			const d = Number(match[3]);
			dateObj = new Date(y, m - 1, d);
		} else {
			dateObj = new Date(trimmed);
		}
	} else if (value instanceof Date) {
		dateObj = value;
	} else {
		dateObj = new Date(value);
	}

	if (Number.isNaN(dateObj.getTime())) {
		return typeof value === "string" ? value : "—";
	}

	try {
		return dateObj.toLocaleDateString("ru-RU", options ?? defaultOptions);
	} catch {
		return formatRussianDateGost(dateObj);
	}
}

/**
 * Преобразует объект Date в строку формата «ГГГГ-ММ-ДД» (local YYYY-MM-DD).
 */
export function localDateString(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Форматирует дату и время в стандартный вид: ДД.ММ.ГГГГ ЧЧ:ММ (например, "24.05.2026 14:30").
 */
export function formatRussianDateTime(
	value: string | Date | number | null | undefined,
	timeZone = "Europe/Samara",
): string {
	if (!value) return "—";
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "—";

	try {
		const parts = new Intl.DateTimeFormat("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZone,
		}).formatToParts(d);

		const day = parts.find((p) => p.type === "day")?.value ?? "01";
		const month = parts.find((p) => p.type === "month")?.value ?? "01";
		const year = parts.find((p) => p.type === "year")?.value ?? "2026";
		const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
		const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

		return `${day}.${month}.${year} ${hour}:${minute}`;
	} catch {
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const hour = String(d.getHours()).padStart(2, "0");
		const min = String(d.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hour}:${min}`;
	}
}

/**
 * Форматирует дату рождения с опциональным расчетом возраста: "15.04.1988 (38 лет)".
 */
export function formatBirthDate(
	value: string | null | undefined,
	includeAge = false,
): string {
	if (!value) return "—";
	const dateGost = formatRussianDateGost(value);
	if (dateGost === "—" || !includeAge) return dateGost;

	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return dateGost;

	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
		age--;
	}

	if (age < 0 || age > 130) return dateGost;

	const ageWord = declineAgeRussian(age);
	return `${dateGost} (${age} ${ageWord})`;
}

function declineAgeRussian(age: number): string {
	const lastDigit = age % 10;
	const lastTwo = age % 100;
	if (lastTwo >= 11 && lastTwo <= 19) return "лет";
	if (lastDigit === 1) return "год";
	if (lastDigit >= 2 && lastDigit <= 4) return "года";
	return "лет";
}

/**
 * Форматирует дату в компактный формат ISO UTC для iCalendar (.ics).
 * Пример: "20260524T143000Z"
 */
export function formatIcsDate(date: string | Date): string {
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) {
		return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	}
	return `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * Форматирует дату для Google Calendar URL.
 */
export const formatGoogleDate = formatIcsDate;

/**
 * Форматирует дату для Yandex Calendar URL.
 */
export function formatYandexDate(date: string | Date): string {
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) {
		return new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
	}
	return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

/**
 * Форматирует длительность в секундах в строку таймера: ММ:СС или ЧЧ:ММ:СС.
 */
export function formatDurationTimer(totalSeconds: number): string {
	const sec = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const remainingSeconds = sec % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Re-export dateTimeUtils components
export {
	formatDateTime,
	formatShortDate,
	formatTime,
	isoDateLabel,
	minutesLabel,
};
