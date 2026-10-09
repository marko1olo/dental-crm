import { hasEncodingDamage } from "../encoding.js";
import { bad, empty, isNullToken, ok, truncateForMessage } from "./common.js";
import type {
	DateFormatHint,
	DateOrder,
	NormalizedDateTime,
	NormalizedValue,
} from "./types.js";

export { isNullToken } from "./common.js";

// ---------------------------------------------------------------------------
// Текст
// ---------------------------------------------------------------------------

/** Максимум для текстового поля. Больше — признак склеенного файла, не данных. */
const MAX_TEXT_LENGTH = 8000;

export function normalizeText(
	raw: string | null | undefined,
	maxLength = MAX_TEXT_LENGTH,
): NormalizedValue<string> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const transforms: string[] = [];
	let value = String(raw);

	if (hasEncodingDamage(value)) {
		return bad(
			"Значение содержит нечитаемые символы — повреждена кодировка источника.",
			["encoding-check"],
		);
	}

	const collapsed = value.replace(/\s+/g, " ").trim();
	if (collapsed !== value) {
		transforms.push("collapse-whitespace");
		value = collapsed;
	}

	if (value.length > maxLength) {
		return bad(
			`Значение длиной ${value.length} символов превышает предел поля (${maxLength}). Обычно это склеенные строки из-за неверного разделителя.`,
			transforms,
		);
	}

	return ok(value, transforms);
}

// ---------------------------------------------------------------------------
// Даты
// ---------------------------------------------------------------------------

const DATE_SEPARATORS = /[./\-\s]/;

/** Excel хранит даты числом дней от 1899-12-30 (с учётом «високосного» 1900). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

function isPlausibleYear(year: number): boolean {
	// Пациент старше 120 лет и запись из будущего одинаково подозрительны.
	const currentYear = new Date().getUTCFullYear();
	return year >= currentYear - 125 && year <= currentYear + 5;
}

/**
 * Двузначный год. Точка разделения выбрана по смыслу данных клиники: «25» —
 * это 1925 (пожилой пациент), а не 2025 (нерождённый). Всё, что даёт дату в
 * будущем, откатывается на век назад.
 */
function expandTwoDigitYear(value: number): number {
	const currentYear = new Date().getUTCFullYear();
	const century = Math.floor(currentYear / 100) * 100;
	const candidate = century + value;
	return candidate > currentYear ? candidate - 100 : candidate;
}

function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

interface DateParts {
	year: number;
	month: number;
	day: number;
}

function partsToIso(parts: DateParts): string {
	const month = String(parts.month).padStart(2, "0");
	const day = String(parts.day).padStart(2, "0");
	return `${parts.year}-${month}-${day}`;
}

/** Раскладывает три числа по указанному порядку. Валидность не проверяет. */
function arrangeParts(
	a: number,
	b: number,
	c: number,
	order: Exclude<DateOrder, "unknown">,
): DateParts {
	if (order === "ymd") return { year: a, month: b, day: c };
	if (order === "mdy") return { year: c, month: a, day: b };
	return { year: c, month: b, day: a };
}

function validateParts(parts: DateParts): boolean {
	if (parts.month < 1 || parts.month > 12) return false;
	if (parts.day < 1) return false;
	if (!isPlausibleYear(parts.year)) return false;
	return parts.day <= daysInMonth(parts.year, parts.month);
}

/** Время суток из строки: минуты от полуночи и признак часового пояса. */
function extractTimeOfDay(
	raw: string,
): { minutes: number; seconds: number; explicitUtc: boolean } | null {
	const match =
		/[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(
			raw.trim(),
		);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = Number(match[3] ?? "0");
	if (hours > 23 || minutes > 59 || seconds > 59) return null;
	const zone = match[4] ?? "";
	return {
		minutes: hours * 60 + minutes,
		seconds,
		// Смещение указано явно — значение уже привязано к поясу, пересчитывать не нужно.
		explicitUtc: zone !== "",
	};
}

/** Три числа из строки даты, если строка вообще похожа на дату. */
function extractDateNumbers(
	raw: string,
): { numbers: number[]; hadTime: boolean } | null {
	const trimmed = raw.trim();

	// Отрезаем время: «12.03.2019 14:30:00» и ISO «2019-03-12T14:30:00Z».
	const withoutTime = trimmed.replace(
		/[T\s]+\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i,
		"",
	);
	const hadTime = withoutTime !== trimmed;

	// Сплошные восемь цифр — формат DBF и многих выгрузок: YYYYMMDD.
	const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(withoutTime);
	if (compact) {
		return {
			numbers: [Number(compact[1]), Number(compact[2]), Number(compact[3])],
			hadTime,
		};
	}

	const pieces = withoutTime.split(DATE_SEPARATORS).filter(Boolean);
	if (pieces.length !== 3) return null;
	if (!pieces.every((piece) => /^\d{1,4}$/.test(piece))) return null;
	return { numbers: pieces.map(Number), hadTime };
}

/**
 * Определяет порядок компонентов по образцам колонки.
 *
 * Решение принимается по «свидетелям» — значениям, которые возможны только при
 * одном порядке (первое число больше 12 → это день, значит не mdy). Если
 * свидетелей нет вовсе, для российской клиники разумнее dmy, но уверенность
 * снижается, и это попадает в отчёт оператору.
 */
export function detectDateOrder(
	samples: readonly (string | null | undefined)[],
): DateFormatHint {
	let dmyWitness = 0;
	let mdyWitness = 0;
	let ymdWitness = 0;
	let parsable = 0;
	let considered = 0;

	for (const sample of samples) {
		if (isNullToken(sample, false)) continue;
		considered += 1;
		const extracted = extractDateNumbers(String(sample));
		if (!extracted) continue;
		const [a, b, c] = extracted.numbers as [number, number, number];
		parsable += 1;

		// Четырёхзначное первое число — год впереди, вопрос закрыт.
		if (a > 31) {
			ymdWitness += 1;
			continue;
		}
		// Первое больше 12 — это день: dmy, но не mdy.
		if (a > 12 && b <= 12) dmyWitness += 1;
		// Второе больше 12 — это день: mdy, но не dmy.
		if (b > 12 && a <= 12) mdyWitness += 1;
		void c;
	}

	const coverage = considered === 0 ? 0 : parsable / considered;

	if (ymdWitness > dmyWitness && ymdWitness > mdyWitness) {
		return {
			order: "ymd",
			rationale: "Первое число больше 31 — год стоит впереди.",
			coverage,
		};
	}
	if (dmyWitness > 0 && dmyWitness >= mdyWitness * 3) {
		return {
			order: "dmy",
			rationale: `Найдено ${dmyWitness} значений, где первое число больше 12 — это день.`,
			coverage,
		};
	}
	if (mdyWitness > 0 && mdyWitness >= dmyWitness * 3) {
		return {
			order: "mdy",
			rationale: `Найдено ${mdyWitness} значений, где второе число больше 12 — это день.`,
			coverage,
		};
	}
	if (dmyWitness > 0 || mdyWitness > 0) {
		return {
			order: "unknown",
			rationale: `Противоречие: ${dmyWitness} значений указывают на день-месяц, ${mdyWitness} — на месяц-день. Колонка смешана.`,
			coverage,
		};
	}
	return {
		order: "dmy",
		rationale:
			"Однозначных признаков нет; принят российский порядок день-месяц-год.",
		coverage,
	};
}

/**
 * Приводит дату к ISO `YYYY-MM-DD`.
 *
 * hint получается из detectDateOrder по всей колонке. Без него разбор
 * неоднозначных дат вида 03/04/2020 был бы угадыванием.
 */
export function normalizeDateValue(
	raw: string | null | undefined,
	hint: DateFormatHint = {
		order: "dmy",
		rationale: "по умолчанию",
		coverage: 0,
	},
): NormalizedValue<string> {
	if (isNullToken(raw)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	// Excel-серийный номер: голое число в правдоподобном диапазоне дат.
	if (/^\d{5}$/.test(text)) {
		const serial = Number(text);
		if (serial >= 1 && serial <= 60_000) {
			const date = new Date(EXCEL_EPOCH_MS + serial * MS_PER_DAY);
			const parts = {
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1,
				day: date.getUTCDate(),
			};
			if (validateParts(parts)) {
				return ok(partsToIso(parts), ["excel-serial"], 0.9);
			}
		}
	}

	// Unix-время в секундах или миллисекундах.
	if (/^\d{10}$/.test(text) || /^\d{13}$/.test(text)) {
		const numeric = Number(text);
		const date = new Date(text.length === 10 ? numeric * 1000 : numeric);
		if (!Number.isNaN(date.getTime())) {
			const parts = {
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1,
				day: date.getUTCDate(),
			};
			if (validateParts(parts)) {
				return ok(
					partsToIso(parts),
					[text.length === 10 ? "unix-seconds" : "unix-millis"],
					0.85,
				);
			}
		}
	}

	const extracted = extractDateNumbers(text);
	if (!extracted) {
		return bad(
			`Значение «${truncateForMessage(text)}» не разобрано как дата.`,
			transforms,
		);
	}
	if (extracted.hadTime) transforms.push("strip-time");

	const [a, b, c] = extracted.numbers as [number, number, number];

	/**
	 * Порядок для конкретного значения. Подсказка по колонке — предпочтение, а не
	 * догма: если при ней дата невалидна, а при другом порядке валидна, значит
	 * колонка смешанная, и правильнее разобрать значение, чем потерять строку.
	 */
	const orders: Exclude<DateOrder, "unknown">[] =
		a > 31
			? ["ymd"]
			: hint.order === "unknown"
				? ["dmy", "mdy"]
				: [hint.order, hint.order === "dmy" ? "mdy" : "dmy", "ymd"];

	const seen = new Set<string>();
	for (const [index, order] of orders.entries()) {
		if (seen.has(order)) continue;
		seen.add(order);

		const parts = arrangeParts(a, b, c, order);
		// Двузначный год расширяем только там, где год стоит на своём месте.
		if (parts.year < 100) {
			parts.year = expandTwoDigitYear(parts.year);
			if (!transforms.includes("expand-2digit-year"))
				transforms.push("expand-2digit-year");
		}
		if (!validateParts(parts)) continue;

		const confidence =
			index === 0
				? hint.order === "unknown"
					? 0.6
					: 0.98
				: // Разобрано порядком, отличным от колоночного — значение подозрительно.
					0.55;
		return ok(partsToIso(parts), [...transforms, `date:${order}`], confidence);
	}

	// Ни один порядок не дал валидной даты — значит дня такого не существует.
	return bad(
		`Дата «${truncateForMessage(text)}» не существует в календаре (проверьте число дней в месяце и год).`,
		transforms,
	);
}

export function normalizeDateTimeValue(
	raw: string | null | undefined,
	hint: DateFormatHint = {
		order: "dmy",
		rationale: "по умолчанию",
		coverage: 0,
	},
): NormalizedValue<NormalizedDateTime> {
	const datePart = normalizeDateValue(raw, hint);
	if (datePart.value === null) {
		return {
			value: null,
			transforms: datePart.transforms,
			confidence: datePart.confidence,
			issue: datePart.issue,
		};
	}

	const time = isNullToken(raw) ? null : extractTimeOfDay(String(raw));
	const transforms = datePart.transforms.filter(
		(transform) => transform !== "strip-time",
	);

	if (!time) {
		return ok(
			{ date: datePart.value, timeMinutes: null, seconds: 0, absolute: false },
			[...transforms, "date-only"],
			datePart.confidence,
		);
	}

	return ok(
		{
			date: datePart.value,
			timeMinutes: time.minutes,
			seconds: time.seconds,
			absolute: time.explicitUtc,
		},
		[
			...transforms,
			time.explicitUtc ? "datetime:absolute" : "datetime:clinic-local",
		],
		datePart.confidence,
	);
}

/**
 * Смещение часового пояса в миллисекундах для конкретного момента.
 *
 * Считается через Intl, а не константой: Россия отменила переход на летнее
 * время в 2014 году, но приёмы 2010 года в выгрузке имеют другое смещение.
 * Константа +3 часа сдвинула бы половину старого расписания на час.
 */
function timeZoneOffsetMs(instantMs: number, timeZone: string): number {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	const parts = formatter.formatToParts(new Date(instantMs));
	const value = (type: string): number =>
		Number(parts.find((part) => part.type === type)?.value ?? "0");
	// hour 24 встречается в некоторых сборках ICU для полуночи.
	const asIfUtc = Date.UTC(
		value("year"),
		value("month") - 1,
		value("day"),
		value("hour") % 24,
		value("minute"),
		value("second"),
	);
	return asIfUtc - instantMs;
}

/**
 * Местное время клиники в момент абсолютного времени.
 *
 * Выгрузка старой системы содержит местное время без указания пояса: «12.03.2019
 * 14:30» означает половину третьего в клинике. Записать это как UTC значило бы
 * сдвинуть весь перенесённый график на три часа, и врач увидел бы приёмы,
 * которых в это время не было.
 *
 * Двойной пересчёт нужен для границы перехода на летнее время: смещение в
 * предполагаемый момент и в исправленный может различаться.
 */
function clinicLocalToUtc(value: NormalizedDateTime, timeZone: string): Date {
	const [year, month, day] = value.date.split("-").map(Number) as [
		number,
		number,
		number,
	];
	const minutes = value.timeMinutes ?? 0;
	const hours = Math.floor(minutes / 60);
	const minuteOfHour = minutes % 60;

	const naive = Date.UTC(
		year,
		month - 1,
		day,
		hours,
		minuteOfHour,
		value.seconds,
	);

	// Явный пояс в источнике — значение уже абсолютное.
	if (value.absolute) return new Date(naive);

	try {
		const firstOffset = timeZoneOffsetMs(naive, timeZone);
		let utc = naive - firstOffset;
		const secondOffset = timeZoneOffsetMs(utc, timeZone);
		if (secondOffset !== firstOffset) utc = naive - secondOffset;
		return new Date(utc);
	} catch {
		// Неизвестное имя пояса — не повод потерять запись; трактуем как UTC.
		return new Date(naive);
	}
}

/** Часовой пояс по умолчанию, если у клиники он не задан. */
const _DEFAULT_CLINIC_TIME_ZONE = "Europe/Moscow";

/**
 * Строковое представление даты со временем для хранения в стейджинге.
 *
 * Формат самоописывающийся и сортируемый лексикографически:
 *   «2019-03-12»              — только дата, времени в источнике не было;
 *   «2019-03-12T14:30:00»     — местное время клиники;
 *   «2019-03-12T14:30:00Z»    — абсолютное время (в источнике был явный пояс).
 *
 * Строка, а не объект: значение попадает в normalized_json, участвует в
 * сравнениях доменных правил и в бизнес-ключах, и со строкой это работает без
 * особых случаев.
 */
export function formatNormalizedDateTime(value: NormalizedDateTime): string {
	if (value.timeMinutes === null) return value.date;
	const hours = String(Math.floor(value.timeMinutes / 60)).padStart(2, "0");
	const minutes = String(value.timeMinutes % 60).padStart(2, "0");
	const seconds = String(value.seconds).padStart(2, "0");
	return `${value.date}T${hours}:${minutes}:${seconds}${value.absolute ? "Z" : ""}`;
}

/**
 * Обратный разбор для загрузчика: строка стейджинга в абсолютный момент.
 *
 * Значение без суффикса Z трактуется как местное время клиники и переводится
 * по её часовому поясу. Значение без времени получает время по умолчанию —
 * загрузчик передаёт его осмысленно (для приёма это начало рабочего дня).
 */
export function storedDateTimeToUtc(
	value: string,
	timeZone: string,
	defaultTimeMinutes = 0,
): Date | null {
	const match =
		/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(Z)?)?$/.exec(
			value.trim(),
		);
	if (!match) {
		// Значение не в нашем формате: пробуем стандартный разбор, чтобы не потерять.
		const fallback = new Date(value);
		return Number.isNaN(fallback.getTime()) ? null : fallback;
	}

	const hasTime = match[4] !== undefined;
	return clinicLocalToUtc(
		{
			date: `${match[1]}-${match[2]}-${match[3]}`,
			timeMinutes: hasTime
				? Number(match[4]) * 60 + Number(match[5])
				: defaultTimeMinutes,
			seconds: Number(match[6] ?? "0"),
			absolute: match[7] === "Z",
		},
		timeZone,
	);
}

/** Только календарная часть значения — для бизнес-ключей и доменных правил. */
export function dateOnlyPart(value: string): string {
	return value.slice(0, 10);
}
