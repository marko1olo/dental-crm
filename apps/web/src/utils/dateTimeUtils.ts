import { toDateTimeLocalValue } from "./dateUtils";

/**
 * Календарный день в виде «ГГГГ-ММ-ДД»: в поясе клиники, если он известен, иначе
 * в местном поясе машины. День по UTC не возвращается никогда — см. разбор у
 * todayDateInputValue.
 */
export function calendarDayInTimeZone(
	moment: Date,
	timeZone?: string | null,
): string {
	if (timeZone) {
		try {
			// en-CA даёт ISO-подобный вид ГГГГ-ММ-ДД. Тот же приём, что на сервере в
			// routes/dayConfirmations.ts: готовой функции «мгновение → местная дата» в
			// стандартной библиотеке нет.
			return new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(moment);
		} catch {
			// Пояс не разобран — считаем по местному. Пустая дата в поле медицинского
			// документа хуже даты, посчитанной по поясу рабочей машины.
		}
	}
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

/**
 * Сдвиг календарного дня на целое число суток.
 *
 * Считается КАЛЕНДАРНО, а не прибавлением 24 часов: в поясе с переходом на
 * зимнее время сутки длятся 25 часов, и 24 прибавленных часа не доводят до
 * следующей даты. Перенос через конец месяца и года делает сам `Date.UTC`: день
 * 32 в июле он превращает в 1 августа.
 *
 * `toISOString` здесь законен и трогать его не надо: и запись, и чтение идут в
 * UTC, где сутки ровно 24 часа всегда. Ошибкой он становится там, где в UTC
 * ЧИТАЮТ момент, собранный по местному времени.
 */
export function shiftCalendarDay(day: string, days: number): string {
	const [year, month, date] = day
		.split("-")
		.map((value) => Number.parseInt(value, 10));
	if (!year || !month || !date) return day;
	return new Date(Date.UTC(year, month - 1, date + days))
		.toISOString()
		.slice(0, 10);
}

/**
 * Сегодняшнее число для поля ввода типа `date`.
 *
 * ЧТО БЫЛО СЛОМАНО. Стояло `new Date().toISOString().slice(0, 10)` — это день по
 * UTC. У ВСЕХ российских поясов смещение положительное (Москва +3, Самара +4 —
 * пояс по умолчанию в схеме, Камчатка +12), поэтому день по UTC отстаёт от
 * местного каждую ночь: в Москве с 00:00 до 03:00, в Самаре до 04:00, на
 * Камчатке — половину суток. Это не про переход на летнее время, который Россия
 * отменила в 2014 году; это срабатывает у каждой клиники, каждый день.
 *
 * ЧЕМ ВРЕДНО. Отсюда заполняются даты медицинских документов: дата открытия
 * карты 025/у и период выписки из медкарты (emptyOutpatient025uDocumentDraftFields,
 * emptyMedicalRecordExtractDocumentDraftFields — оба черновика становятся
 * начальным состоянием документа). Карта 025/у — форма государственного учёта,
 * выписка — основание для страховой и для суда. Документ с датой на день раньше
 * факта расходится с картой, и заметить это можно только вручную.
 *
 * И правильный расчёт того же дня в проекте УЖЕ БЫЛ — documentLogic.ts,
 * withDocumentCreationTimestamps собирает день из местных полей `Date`. Но он
 * заполняет только ПУСТЫЕ поля, а предзаполненное неверное число пустым не
 * является: верный расчёт молча уступал неверному. Сторож
 * tests/documentCreationTimestamps.test.ts это не ловил, потому что вызывает
 * функцию с явно пустым полем и рабочего пути не проходит.
 *
 * Пояс клиники передаётся, когда вызывающий его знает
 * (`dashboard.clinicSettings.profile.timezone`). Параметр необязательный
 * намеренно: подпись расширена, а не изменена, поэтому ни один существующий
 * вызов не пришлось трогать.
 */
export function todayDateInputValue(timeZone?: string | null): string {
	return calendarDayInTimeZone(new Date(), timeZone);
}

/** То же число, сдвинутое на `days` календарных суток: сроки оплаты и графики платежей. */
export function dateInputValuePlusDays(
	days: number,
	timeZone?: string | null,
): string {
	return shiftCalendarDay(calendarDayInTimeZone(new Date(), timeZone), days);
}

export function formatTime(value: string) {
	return new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Samara",
	}).format(new Date(value));
}

/**
 * Дата вида «2026-05-24» человеческим видом: «24.05.2026».
 *
 * Нужна там, где в интерфейс попадает строка даты из данных, а не отметка
 * времени: на экране «Документы» стояло «проверено 2026-05-24».
 */
export function isoDateLabel(value: unknown): string {
	if (typeof value !== "string" || !value) return "";
	const [year, month, day] = value.slice(0, 10).split("-");
	if (!year || !month || !day || year.length !== 4) return value;
	return `${day}.${month}.${year}`;
}

export function minutesLabel(value: number) {
	if (value < 60) return `${value} мин`;
	const hours = Math.floor(value / 60);
	const minutes = value % 60;
	return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

export function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Samara",
	}).format(new Date(value));
}

export function formatShortDate(value: string) {
	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		timeZone: "Europe/Samara",
	}).format(new Date(value));
}

export function validClockTime(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeClockTime(value: string, fallback: string): string {
	return validClockTime(value) ? value : fallback;
}

export function timeZoneOffsetMinutes(
	timeZone: string | null | undefined,
	at: Date,
): number {
	if (!timeZone) return -at.getTimezoneOffset();
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "shortOffset",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(at);
		const value =
			parts.find((part) => part.type === "timeZoneName")?.value ?? "";
		if (value === "GMT" || value === "UTC") return 0;
		const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
		if (!match) return -at.getTimezoneOffset();
		const sign = match[1] === "-" ? -1 : 1;
		return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
	} catch {
		return -at.getTimezoneOffset();
	}
}

export function timeZoneOffsetSuffix(offsetMinutes: number): string {
	const sign = offsetMinutes < 0 ? "-" : "+";
	const absolute = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
	const minutes = String(absolute % 60).padStart(2, "0");
	return `${sign}${hours}:${minutes}`;
}

export function timeZoneDateParts(
	value: string,
	timeZone: string | null | undefined,
): string | null {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	if (!timeZone) return null;
	try {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(parsed);
		const valueByType = new Map(parts.map((part) => [part.type, part.value]));
		const hour =
			valueByType.get("hour") === "24" ? "00" : valueByType.get("hour");
		const year = valueByType.get("year");
		const month = valueByType.get("month");
		const day = valueByType.get("day");
		const minute = valueByType.get("minute");
		return year && month && day && hour && minute
			? `${year}-${month}-${day}T${hour}:${minute}`
			: null;
	} catch {
		return null;
	}
}

export function fromDateTimeLocalValue(
	value: string,
	timeZone?: string | null,
): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
	if (match && timeZone) {
		const [, year, month, day, hour, minute] = match;
		const utcGuess = new Date(
			Date.UTC(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
			),
		);
		let offsetMinutes = timeZoneOffsetMinutes(timeZone, utcGuess);
		const correctedInstant = new Date(
			utcGuess.getTime() - offsetMinutes * 60_000,
		);
		const correctedOffsetMinutes = timeZoneOffsetMinutes(
			timeZone,
			correctedInstant,
		);
		if (correctedOffsetMinutes !== offsetMinutes)
			offsetMinutes = correctedOffsetMinutes;
		return `${year}-${month}-${day}T${hour}:${minute}:00${timeZoneOffsetSuffix(offsetMinutes)}`;
	}
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function addMinutesToClinicDateTimeLocal(
	value: string,
	minutes: number,
	timeZone: string,
): string {
	const iso = fromDateTimeLocalValue(value, timeZone);
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return value;
	return toDateTimeLocalValue(
		new Date(parsed.getTime() + minutes * 60_000).toISOString(),
		timeZone,
	);
}

export function weekdayFromDateInput(value: string): number {
	const parsed = Date.parse(`${value}T12:00:00Z`);
	return Number.isNaN(parsed) ? 1 : new Date(parsed).getUTCDay();
}

export function isValidDateParts(
	year: number,
	month: number,
	day: number,
): boolean {
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

export function toDateInputValue(value: string | null | undefined): string {
	const trimmed = value?.trim() ?? "";
	if (!trimmed) return "";
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
	if (iso && isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3])))
		return `${iso[1]}-${iso[2]}-${iso[3]}`;
	const ru = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(trimmed);
	if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1])))
		return `${ru[3]}-${ru[2]}-${ru[1]}`;
	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) return trimmed;
	const local = new Date(
		parsed.getTime() - parsed.getTimezoneOffset() * 60_000,
	);
	return local.toISOString().slice(0, 10);
}

export function isDateInputValue(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	return (
		!!match &&
		isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
	);
}

export function isDateTimeLocalInputValue(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
	if (
		!match ||
		!isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
	)
		return false;
	const hours = Number(match[4]);
	const minutes = Number(match[5]);
	return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}
