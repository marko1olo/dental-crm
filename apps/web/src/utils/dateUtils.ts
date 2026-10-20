/**
 * Date/Time utilities re-export facade per Mandate 8s (SSOT: formatters.ts & dateTimeUtils.ts).
 */
export {
	currentLocalDateTimeInputValue,
	timeZoneDateParts,
	toDateTimeLocalValue,
	fromDateTimeLocalValue,
	todayDateInputValue,
	dateInputValuePlusDays,
	calendarDayInTimeZone,
	shiftCalendarDay,
} from "./dateTimeUtils.js";

export {
	formatRussianDate,
	formatRussianDateGost,
	formatDateRu,
	formatRussianDateTime,
	formatDateTime,
	formatTime,
	formatShortDate,
	isoDateLabel,
	formatBirthDate,
	formatIcsDate,
	formatGoogleDate,
	formatYandexDate,
	formatDurationTimer,
	minutesLabel,
} from "./formatters.js";

import { formatShortDate } from "./formatters.js";
export const formatRuDateShort = (d: string | Date | number): string =>
	formatShortDate(d instanceof Date ? d.toISOString() : typeof d === "number" ? new Date(d).toISOString() : d);
