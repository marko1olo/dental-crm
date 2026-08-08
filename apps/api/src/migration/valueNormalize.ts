import { formatKopecksRu, kopecksToNumericString } from "@dental/shared";
import { hasEncodingDamage } from "./encoding.js";

/**
 * Приведение значений чужой системы к нашим форматам.
 *
 * ГЛАВНЫЙ ПРИНЦИП: нераспознанное значение НЕ пропускается дальше как есть.
 * Существующий shared/utils/dates.ts на непонятной строке возвращает её же:
 *
 *     normalizeDate("не помнит") === "не помнит"
 *
 * — и «не помнит» уезжает в колонку birth_date. Здесь любое значение либо
 * разобрано и приведено, либо возвращено с описанием проблемы, по которому
 * строка уходит в карантин. Третьего состояния нет.
 */

export interface NormalizedValue<T> {
	value: T | null;
	/** Цепочка применённых преобразований для происхождения поля. */
	transforms: string[];
	/** 0..1. Значение ниже порога отправляет строку в карантин. */
	confidence: number;
	/** Описание проблемы на русском либо null. */
	issue: string | null;
}

function ok<T>(
	value: T,
	transforms: string[],
	confidence = 1,
): NormalizedValue<T> {
	return { value, transforms, confidence, issue: null };
}

function empty<T>(transforms: string[] = []): NormalizedValue<T> {
	return { value: null, transforms, confidence: 1, issue: null };
}

function bad<T>(issue: string, transforms: string[] = []): NormalizedValue<T> {
	return { value: null, transforms, confidence: 0, issue };
}

/**
 * Значения, которыми чужие системы обозначают пустоту. Записать «нет данных»
 * в телефон пациента хуже, чем оставить поле пустым: по такому «номеру» потом
 * пытаются звонить, а фильтр «есть телефон» показывает ложную полноту базы.
 */
const NULL_TOKENS = new Set([
	"",
	"-",
	"--",
	"---",
	"—",
	"–",
	"н/д",
	"нд",
	"н.д.",
	"нет",
	"нет данных",
	"не указан",
	"не указано",
	"не указана",
	"неизвестно",
	"не помнит",
	"отсутствует",
	"null",
	"nil",
	"none",
	"n/a",
	"na",
	"?",
	"??",
	"0",
	"00.00.0000",
	"00/00/0000",
	"0000-00-00",
	"01.01.1900",
	"1900-01-01",
	"1899-12-30",
	"30.12.1899",
	"empty",
	"пусто",
	/**
	 * Заглушки, которые администраторы вбивают в обязательные поля,
	 * чтобы пропустить их (например, когда телефон неизвестен).
	 */
	"x",
	"xxx",
	/**
	 * Значения ошибок Excel. Попадают в выгрузку, когда в исходной книге стояла
	 * формула со ссылкой на удалённый лист. Для переноса это отсутствие данных,
	 * а не текст: «#ССЫЛКА!» в поле «Телефон» — не номер.
	 */
	"#н/д",
	"#знач!",
	"#дел/0!",
	"#ссылка!",
	"#имя?",
	"#пусто!",
	"#число!",
	"#n/a",
	"#value!",
	"#div/0!",
	"#ref!",
	"#name?",
	"#null!",
	"#num!",
	"#нд",
	"#error",
	"#ошибка",
]);

/**
 * Признак пустого значения. "0" в списке намеренно: в DBF-выгрузках нулём
 * забивают незаполненные числовые ссылки и даты. Для денежных полей это
 * правило отключается отдельным флагом — там ноль осмыслен.
 */
export function isNullToken(
	value: string | null | undefined,
	treatZeroAsNull = true,
): boolean {
	if (value === null || value === undefined) return true;
	const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
	if (normalized === "") return true;
	if (!treatZeroAsNull && /^0+([.,]0+)?$/.test(normalized)) return false;
	return NULL_TOKENS.has(normalized);
}

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

/**
 * Порядок компонентов в датах колонки. Определяется по всей колонке сразу, а не
 * по отдельному значению: «03/04/2020» в одиночку неразличимо, но если где-то в
 * той же колонке встретилось «17/04/2020», порядок задан однозначно для всех.
 */
type DateOrder = "dmy" | "mdy" | "ymd" | "unknown";

export interface DateFormatHint {
	order: DateOrder;
	/** Как принято решение — попадает в описание преобразования. */
	rationale: string;
	/** Доля значений колонки, разобравшихся при выбранном порядке. */
	coverage: number;
}

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

/**
 * Дата вместе со временем суток.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ normalizeDateValue
 * Тот отрезает время намеренно: дата рождения не имеет времени, и «01.01.1980
 * 00:00:00» из выгрузки не должно превращаться в момент. Но для записи в
 * расписании время — это и есть содержание: приём в 14:30 и приём в 09:00 —
 * разные события. Перенос расписания, теряющий время, бесполезен, а хуже того —
 * выглядит успешным: даты на месте, все строки загружены, сверка сошлась.
 */
export interface NormalizedDateTime {
	/** Дата в ISO: YYYY-MM-DD. */
	date: string;
	/** Минуты от полуночи местного времени клиники. null — время не указано. */
	timeMinutes: number | null;
	/** Секунды внутри минуты — сохраняются, если были в источнике. */
	seconds: number;
	/**
	 * true — в источнике был явный часовой пояс (суффикс Z или ±HH:MM), значение
	 * уже абсолютное и пересчитывать его по поясу клиники нельзя.
	 */
	absolute: boolean;
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

// ---------------------------------------------------------------------------
// Телефоны
// ---------------------------------------------------------------------------

/**
 * Российские мобильные коды начинаются с 9. Городские номера тоже переносим,
 * но помечаем пониженной уверенностью: отправить SMS на городской нельзя, и
 * система напоминаний должна знать об этом заранее.
 */
export interface NormalizedPhone {
	/** E.164: +79001234567. */
	e164: string;
	mobile: boolean;
	/** Добавочный номер, если был указан. */
	extension: string | null;
}

export function normalizePhoneValue(
	raw: string | null | undefined,
): NormalizedValue<NormalizedPhone> {
	if (isNullToken(raw)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	// Добавочный: «+7 495 1234567 доб. 205», «... ext 205», «... #205».
	let working = text;
	let extension: string | null = null;
	const extensionMatch =
		/(?:доб\.?|добавочный|ext\.?|extension|x|#)\s*(\d{1,6})\s*$/i.exec(working);
	if (extensionMatch) {
		extension = extensionMatch[1]!;
		working = working.slice(0, extensionMatch.index);
		transforms.push("split-extension");
	}

	/**
	 * В одной ячейке часто лежит несколько номеров: «8-900-111-22-33, 495-000-11-22».
	 * Берём первый — остальные не теряются: исходная ячейка целиком сохранена в
	 * стейджинге, а вызывающий код кладёт хвост в примечание.
	 */
	const segments = working
		.split(/[,;/]|\sили\s|\sи\s/i)
		.map((part) => part.trim())
		.filter(Boolean);
	if (segments.length > 1) transforms.push("multiple-numbers-first-taken");
	const candidate = segments[0] ?? working;

	const digits = candidate.replace(/\D/g, "");
	if (!digits) {
		return bad(
			`В значении «${truncateForMessage(text)}» нет ни одной цифры телефона.`,
			transforms,
		);
	}

	let national: string;
	if (
		digits.length === 11 &&
		(digits.startsWith("7") || digits.startsWith("8"))
	) {
		national = digits.slice(1);
		if (digits.startsWith("8")) transforms.push("drop-trunk-8");
	} else if (digits.length === 10) {
		national = digits;
		transforms.push("assume-ru-country-code");
	} else if (digits.length === 12 && digits.startsWith("77")) {
		// Казахстан: +7 7xx. Формально та же зона, но номер национальный.
		national = digits.slice(1, 11);
	} else if (digits.length > 11 && digits.length <= 15) {
		// Иностранный номер — переносим как есть, без домысливания кода страны.
		return ok(
			{ e164: `+${digits}`, mobile: false, extension },
			[...transforms, "foreign-number-as-is"],
			0.6,
		);
	} else if (digits.length >= 5 && digits.length <= 7) {
		return bad(
			`Номер «${truncateForMessage(text)}» состоит из ${digits.length} цифр — это внутренний или укороченный городской номер без кода города, дозвониться по нему нельзя.`,
			transforms,
		);
	} else {
		return bad(
			`Номер «${truncateForMessage(text)}» состоит из ${digits.length} цифр вместо 10 или 11.`,
			transforms,
		);
	}

	if (national.length !== 10) {
		return bad(
			`Номер «${truncateForMessage(text)}» не приводится к российскому формату.`,
			transforms,
		);
	}
	// Код региона/оператора не начинается с 0 или 1 ни у одного действующего номера.
	if (national.startsWith("0") || national.startsWith("1")) {
		return bad(
			`Номер «${truncateForMessage(text)}» имеет несуществующий код «${national.slice(0, 3)}».`,
			transforms,
		);
	}

	const mobile = national.startsWith("9");
	return ok(
		{ e164: `+7${national}`, mobile, extension },
		[...transforms, "phone:e164"],
		mobile ? 0.98 : 0.8,
	);
}

// ---------------------------------------------------------------------------
// Имена
// ---------------------------------------------------------------------------

export interface NormalizedName {
	fullName: string;
	lastName: string | null;
	firstName: string | null;
	middleName: string | null;
}

/**
 * Частицы фамилий, которые пишутся со строчной и не должны получать заглавную
 * при исправлении регистра: «ван дер Берг», «де ла Крус».
 */
const LOWERCASE_NAME_PARTICLES = new Set([
	"ван",
	"де",
	"дер",
	"ла",
	"ле",
	"фон",
	"да",
	"ди",
	"дель",
	"оглы",
	"кызы",
	"уулу",
]);

/**
 * Исправляет регистр имени.
 *
 * Выгрузки из DOS-систем поголовно в верхнем регистре («ИВАНОВ ИВАН»), а
 * записи администраторов — в нижнем. Печатать «ИВАНОВ» в справке для налоговой
 * нельзя, поэтому регистр приводится, но только если он явно однородный: имя
 * «МакДональд» или «Иванов-Петров» не должно пострадать.
 */
export function fixNameCase(value: string): {
	value: string;
	changed: boolean;
} {
	const letters = value.replace(/[^\p{L}]/gu, "");
	if (!letters) return { value, changed: false };

	const allUpper =
		letters === letters.toUpperCase() && letters !== letters.toLowerCase();
	const allLower =
		letters === letters.toLowerCase() && letters !== letters.toUpperCase();
	if (!allUpper && !allLower) return { value, changed: false };

	const fixed = value
		.toLowerCase()
		.split(/(\s+|-)/)
		.map((token) => {
			if (!token.trim() || token === "-") return token;
			if (LOWERCASE_NAME_PARTICLES.has(token)) return token;
			return token.charAt(0).toUpperCase() + token.slice(1);
		})
		.join("");

	return { value: fixed, changed: fixed !== value };
}

/**
 * Разбирает ФИО.
 *
 * Поддерживает три формата, встречающиеся в выгрузках:
 *   «Иванов Иван Иванович»        — российский порядок,
 *   «Иванов, Иван Иванович»       — фамилия отделена запятой,
 *   «IVANOV^IVAN^IVANOVICH»       — DICOM, разделитель «^».
 */
export function normalizeNameValue(
	raw: string | null | undefined,
): NormalizedValue<NormalizedName> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	if (hasEncodingDamage(text)) {
		return bad(
			"ФИО содержит нечитаемые символы — повреждена кодировка источника.",
			["encoding-check"],
		);
	}

	let parts: string[];
	if (text.includes("^")) {
		parts = text
			.split("^")
			.map((part) => part.trim())
			.filter(Boolean);
		transforms.push("dicom-caret-format");
	} else if (text.includes(",")) {
		const [surname, rest] = text.split(",", 2);
		parts = [surname ?? "", ...(rest ?? "").trim().split(/\s+/)]
			.map((part) => part.trim())
			.filter(Boolean);
		transforms.push("comma-separated");
	} else {
		parts = text.split(/\s+/).filter(Boolean);
	}

	if (parts.length === 0) return empty(transforms);

	/**
	 * Строка вида «Иванов И.И.» — инициалы, а не имя и отчество. Разворачивать их
	 * в полные имена нельзя (это выдумывание данных), но и склеивать неверно.
	 */
	const cased = parts.map((part) => {
		const { value, changed } = fixNameCase(part);
		if (changed && !transforms.includes("fix-case"))
			transforms.push("fix-case");
		return value;
	});

	// Мусор вместо ФИО: одни цифры, одна буква, служебные слова.
	const letterCount = cased.join("").replace(/[^\p{L}]/gu, "").length;
	if (letterCount < 2) {
		return bad(
			`Значение «${truncateForMessage(text)}» не похоже на ФИО.`,
			transforms,
		);
	}

	const fullName = cased.join(" ");
	const [lastName = null, firstName = null, ...restParts] = cased;
	const middleName = restParts.length > 0 ? restParts.join(" ") : null;

	/**
	 * Один токен — это либо только фамилия, либо название организации-плательщика.
	 * Переносим, но с пониженной уверенностью: оператор увидит такие строки
	 * в списке предупреждений.
	 */
	const confidence =
		cased.length === 1 ? 0.65 : cased.length === 2 ? 0.9 : 0.98;

	return ok(
		{ fullName, lastName, firstName, middleName },
		transforms,
		confidence,
	);
}

/** Собирает ФИО из раздельных колонок фамилии, имени и отчества. */
export function combineNameParts(
	lastName: string | null | undefined,
	firstName: string | null | undefined,
	middleName: string | null | undefined,
): NormalizedValue<NormalizedName> {
	const pieces = [lastName, firstName, middleName]
		.map((part) => (isNullToken(part, false) ? null : String(part).trim()))
		.filter((part): part is string => Boolean(part));

	if (pieces.length === 0) return empty(["null-token"]);

	const transforms = ["combine-name-parts"];
	const cased = pieces.map((part) => {
		const { value, changed } = fixNameCase(part);
		if (changed && !transforms.includes("fix-case"))
			transforms.push("fix-case");
		return value;
	});

	return ok(
		{
			fullName: cased.join(" "),
			lastName: cased[0] ?? null,
			firstName: cased[1] ?? null,
			middleName: cased.slice(2).join(" ") || null,
		},
		transforms,
		pieces.length >= 2 ? 0.98 : 0.7,
	);
}

// ---------------------------------------------------------------------------
// Деньги
// ---------------------------------------------------------------------------

/**
 * Разбирает денежную сумму в ЦЕЛЫЕ КОПЕЙКИ.
 *
 * Заголовок раньше утверждал «в целые рубли», а функция всегда возвращала
 * копейки (см. `money:kopecks` в конце): именно это расхождение и убедило
 * соседнюю normalizeMoneyRubles округлять до рубля. Возвращаются копейки —
 * целое число, ничего не округлено, ничего не потеряно.
 */
export function normalizeMoneyValue(
	raw: string | null | undefined,
): NormalizedValue<number> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	// Отрицательное в скобках — бухгалтерская запись: (1 500,00).
	let working = text;
	let negative = false;
	if (/^\(.*\)$/.test(working)) {
		negative = true;
		working = working.slice(1, -1);
		transforms.push("accounting-parentheses");
	}

	// Убираем валюту и всё нецифровое, кроме разделителей и знака.
	working = working
		.replace(/(?:руб(?:лей|ля|\.)?|₽|rub|р\.)/gi, "")
		.replace(/[\s ']/g, "")
		.trim();

	if (working.startsWith("-")) {
		negative = true;
		working = working.slice(1);
	} else if (working.startsWith("+")) {
		working = working.slice(1);
	}

	if (!/^[\d.,]+$/.test(working) || !/\d/.test(working)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» не разобрана как число.`,
			transforms,
		);
	}

	/**
	 * Разделитель дробной части. Неоднозначность «1,500» — это полторы тысячи
	 * (США) или один рубль пятьдесят копеек (Россия)? Решаем по правилу: если
	 * после последнего разделителя ровно три цифры И в строке есть другой
	 * разделитель — это группировка разрядов. Иначе — дробная часть.
	 */
	const lastComma = working.lastIndexOf(",");
	const lastDot = working.lastIndexOf(".");
	const lastSeparator = Math.max(lastComma, lastDot);

	let normalized: string;
	if (lastSeparator === -1) {
		normalized = working;
	} else {
		const tail = working.slice(lastSeparator + 1);
		const head = working.slice(0, lastSeparator);
		const headHasSeparator = /[.,]/.test(head);

		if (tail.length === 3 && (headHasSeparator || head.length <= 3)) {
			// Группировка разрядов: 1,500 → 1500. Дробной части нет.
			normalized = working.replace(/[.,]/g, "");
			transforms.push("thousands-separator");
		} else if (tail.length <= 2) {
			normalized = `${head.replace(/[.,]/g, "")}.${tail}`;
			if (tail.length > 0) transforms.push("decimal-separator");
		} else {
			return bad(
				`Сумма «${truncateForMessage(text)}» имеет непонятный разделитель разрядов.`,
				transforms,
			);
		}
	}

	/**
	 * Копейки считаются из строки регулярным выражением, а не через parseFloat:
	 * «23400.50» → 2340050 точно. Тот же приём, что в packages/shared/utils/money.ts,
	 * и по той же причине — деньги не должны проходить через плавающую точку.
	 */
	const kopecksMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
	if (!kopecksMatch) {
		return bad(
			`Сумма «${truncateForMessage(text)}» не разобрана как число.`,
			transforms,
		);
	}
	const wholePart = Number(kopecksMatch[1]);
	const fractionPart = Number((kopecksMatch[2] ?? "").padEnd(2, "0") || "0");
	if (!Number.isSafeInteger(wholePart)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» выходит за допустимые пределы.`,
			transforms,
		);
	}
	const magnitudeKopecks = wholePart * 100 + fractionPart;
	const kopecks = negative ? -magnitudeKopecks : magnitudeKopecks;

	if (!Number.isSafeInteger(kopecks)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» выходит за допустимые пределы.`,
			transforms,
		);
	}
	// Платёж в миллиард рублей в стоматологии — это ошибка разбора, а не платёж.
	if (Math.abs(kopecks) > 100_000_000_000) {
		return bad(
			`Сумма ${formatKopecksRu(kopecks)} неправдоподобна — вероятно, в колонку попало не денежное значение.`,
			transforms,
		);
	}

	return ok(kopecks, [...transforms, "money:kopecks"], 0.97);
}

/**
 * Сумма в рублях с копейками — ровно то значение, которое ложится в денежную
 * колонку numeric(12, 2).
 *
 * ЗАЧЕМ ДВЕ ФУНКЦИИ
 * normalizeMoneyValue отдаёт целые копейки: в них считают и сверяют. Здесь то же
 * значение переводится в рубли для записи в колонку, и перевод точный — через
 * строку numeric(12, 2) из @dental/shared, а не делением с плавающей точкой.
 *
 * БЫЛО: `Math.round(kopecks.value / 100)`, то есть округление до целого рубля,
 * с пометкой «round-kopecks-to-rubles» в происхождении поля. Обоснование стояло
 * в этом же комментарии: «колонка payments.amount_rub объявлена целыми рублями».
 * ЭТО НЕВЕРНО с миграции 0131: колонка — numeric(12, 2), объявлена
 * `numeric("amount_rub", { precision: 12, scale: 2, mode: "number" })`
 * (db/schema.ts), и drizzle пишет её через String(), то есть 23400.5 доходит до
 * базы как «23400.5» и хранится как 23400.50. Копейки влезают.
 *
 * Цена ошибки была необратимой: клиника, переезжающая с чужой системы, теряла
 * копейки на КАЖДОМ платеже своей истории — «23 400,50» ложилось как 23 401, —
 * причём точное значение было посчитано строкой выше и выброшено. Восстановить
 * его после переноса нельзя ничем: исходной выгрузки у клиники может уже не быть.
 *
 * Точные копейки по-прежнему сохраняются в normalized_json (rowTransform.ts):
 * это независимая точка отсчёта для сверки, и она нужна, чтобы доказать, что
 * колонка получила ровно разобранное значение, а не «примерно» его.
 */
export function normalizeMoneyRubles(
	raw: string | null | undefined,
): NormalizedValue<number> {
	const kopecks = normalizeMoneyValue(raw);
	if (kopecks.value === null) {
		return {
			value: null,
			transforms: kopecks.transforms,
			confidence: kopecks.confidence,
			issue: kopecks.issue,
		};
	}
	const rubles = Number(kopecksToNumericString(kopecks.value));
	const transforms = [
		...kopecks.transforms.filter((transform) => transform !== "money:kopecks"),
		"money:rub",
	];
	return ok(rubles, transforms, kopecks.confidence);
}

// ---------------------------------------------------------------------------
// Пол, флаги, перечисления
// ---------------------------------------------------------------------------

export type Gender = "male" | "female";

const MALE_TOKENS = new Set([
	"м",
	"муж",
	"мужской",
	"мужчина",
	"m",
	"male",
	"1",
	"м.",
]);
const FEMALE_TOKENS = new Set([
	"ж",
	"жен",
	"женский",
	"женщина",
	"f",
	"female",
	"ж.",
	"w",
	"2",
]);

export function normalizeGenderValue(
	raw: string | null | undefined,
): NormalizedValue<Gender> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const token = String(raw).trim().toLowerCase();
	if (MALE_TOKENS.has(token)) return ok("male", ["gender:token"], 0.97);
	if (FEMALE_TOKENS.has(token)) return ok("female", ["gender:token"], 0.97);
	return bad(`Значение пола «${truncateForMessage(token)}» не распознано.`, [
		"gender:token",
	]);
}

const TRUE_TOKENS = new Set([
	"1",
	"true",
	"да",
	"yes",
	"y",
	"истина",
	"t",
	"+",
	"есть",
]);
const FALSE_TOKENS = new Set([
	"0",
	"false",
	"нет",
	"no",
	"n",
	"ложь",
	"f",
	"-",
	"отсутствует",
]);

export function normalizeBooleanValue(
	raw: string | null | undefined,
): NormalizedValue<boolean> {
	if (raw === null || raw === undefined || String(raw).trim() === "")
		return empty(["null-token"]);
	const token = String(raw).trim().toLowerCase();
	if (TRUE_TOKENS.has(token)) return ok(true, ["boolean:token"]);
	if (FALSE_TOKENS.has(token)) return ok(false, ["boolean:token"]);
	return bad(
		`Значение «${truncateForMessage(token)}» не распознано как да/нет.`,
		["boolean:token"],
	);
}

/**
 * Приводит значение к одному из допустимых, сопоставляя по словарю синонимов.
 * Используется для статусов записей и способов оплаты, где у каждой системы
 * свой набор слов для одного и того же.
 */
export function normalizeEnumValue<T extends string>(
	raw: string | null | undefined,
	synonyms: Record<string, T>,
	fallback: T | null = null,
): NormalizedValue<T> {
	if (isNullToken(raw, false)) {
		return fallback
			? ok(fallback, ["enum:default"], 0.5)
			: empty(["null-token"]);
	}
	const token = String(raw)
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, " ");
	const direct = synonyms[token];
	if (direct) return ok(direct, ["enum:exact"], 0.97);

	// Частичное совпадение: «отменена пациентом» → «отменена».
	for (const [candidate, target] of Object.entries(synonyms)) {
		if (candidate.length >= 4 && token.includes(candidate)) {
			return ok(target, ["enum:partial"], 0.8);
		}
	}

	if (fallback) {
		return {
			value: fallback,
			transforms: ["enum:fallback"],
			confidence: 0.4,
			issue: null,
		};
	}
	return bad(
		`Значение «${truncateForMessage(token)}» не сопоставлено ни одному известному состоянию.`,
		["enum:miss"],
	);
}

// ---------------------------------------------------------------------------
// Зубные формулы
// ---------------------------------------------------------------------------

/**
 * Приводит номер зуба к нотации FDI (двузначной), принятой в нашей модели.
 *
 * Российские системы используют FDI («16»), американские — Universal («3»),
 * встречается и запись «1.6». Постоянные зубы 11–48, молочные 51–85.
 */
export function normalizeToothCode(
	raw: string | null | undefined,
): NormalizedValue<string> {
	if (isNullToken(raw)) return empty(["null-token"]);
	const text = String(raw).trim().replace(/\s+/g, "");

	const fdiDotted = /^([1-8])\.([1-8])$/.exec(text);
	if (fdiDotted)
		return ok(`${fdiDotted[1]}${fdiDotted[2]}`, ["tooth:fdi-dotted"], 0.97);

	const digits = text.replace(/\D/g, "");
	if (digits.length === 2) {
		const quadrant = Number(digits[0]);
		const position = Number(digits[1]);
		const permanent =
			quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
		const deciduous =
			quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
		if (permanent || deciduous) return ok(digits, ["tooth:fdi"], 0.98);
		return bad(
			`Номер зуба «${truncateForMessage(text)}» не существует в нотации FDI.`,
			["tooth:fdi"],
		);
	}

	/**
	 * Universal 1..32 переводим в FDI. Однозначного признака нотации у одиночного
	 * значения нет («18» — это FDI восьмёрка справа сверху или Universal
	 * восьмёрка слева снизу), поэтому уверенность понижена и решение видно
	 * в происхождении поля.
	 */
	if (digits.length === 1 || (digits.length === 2 && Number(digits) <= 32)) {
		const universal = Number(digits);
		if (universal >= 1 && universal <= 32) {
			const quadrant = Math.floor((universal - 1) / 8) + 1;
			const indexInQuadrant = (universal - 1) % 8;
			// Universal идёт 1→16 по верхней дуге справа налево, 17→32 по нижней слева направо.
			const fdi =
				quadrant === 1
					? `1${8 - indexInQuadrant}`
					: quadrant === 2
						? `2${indexInQuadrant + 1}`
						: quadrant === 3
							? `3${8 - indexInQuadrant}`
							: `4${indexInQuadrant + 1}`;
			return ok(fdi, ["tooth:universal-to-fdi"], 0.6);
		}
	}

	return bad(`Номер зуба «${truncateForMessage(text)}» не распознан.`, [
		"tooth:unknown",
	]);
}

// ---------------------------------------------------------------------------
// Служебное
// ---------------------------------------------------------------------------

/**
 * Обрезает значение для сообщения оператору.
 *
 * Сообщения об ошибках попадают в карантин и в отчёты, а туда не должны
 * утекать длинные куски персональных данных: цель — показать, ЧТО не так,
 * а не воспроизвести содержимое карточки.
 */
export function truncateForMessage(value: string, maxLength = 60): string {
	const collapsed = value.replace(/\s+/g, " ").trim();
	return collapsed.length <= maxLength
		? collapsed
		: `${collapsed.slice(0, maxLength)}…`;
}

export function normalizeEmailValue(
	raw: string | null | undefined,
): NormalizedValue<string> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim().toLowerCase();
	// Несколько адресов в ячейке — берём первый, остальное остаётся в raw_json.
	const first = text.split(/[,;\s]+/).filter(Boolean)[0] ?? text;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(first)) {
		return bad(
			`Адрес «${truncateForMessage(text)}» не похож на электронную почту.`,
			["email:validate"],
		);
	}
	return ok(
		first,
		first === text ? ["email:validate"] : ["email:first-of-many"],
		0.95,
	);
}
