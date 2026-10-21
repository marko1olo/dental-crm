import type { MonthProductionCalendarNorm2026 } from "./types";

/**
 * Russian Production Calendar for 2026 (Производственный календарь РФ на 2026 год)
 * Statutory standard for 33-hour medical workweek (ст. 350 ТК РФ: 6.6 ч/день, -1ч в предпраздничные дни)
 */
export const RUSSIAN_PRODUCTION_CALENDAR_2026: Record<number, MonthProductionCalendarNorm2026> = {
	1: {
		month: 1, nameRu: "Январь", workingDays: 15, preHolidayDays: 0,
		holidaysAndWeekends: 16, normHours33: 99.0, normHours39: 117.0, normHours40: 120.0,
	},
	2: {
		month: 2, nameRu: "Февраль", workingDays: 19, preHolidayDays: 1,
		holidaysAndWeekends: 9, normHours33: 124.4, normHours39: 147.2, normHours40: 151.0,
	},
	3: {
		month: 3, nameRu: "Март", workingDays: 21, preHolidayDays: 0,
		holidaysAndWeekends: 10, normHours33: 138.6, normHours39: 163.8, normHours40: 168.0,
	},
	4: {
		month: 4, nameRu: "Апрель", workingDays: 22, preHolidayDays: 1,
		holidaysAndWeekends: 8, normHours33: 144.2, normHours39: 170.6, normHours40: 175.0,
	},
	5: {
		month: 5, nameRu: "Май", workingDays: 19, preHolidayDays: 1,
		holidaysAndWeekends: 12, normHours33: 124.4, normHours39: 147.2, normHours40: 151.0,
	},
	6: {
		month: 6, nameRu: "Июнь", workingDays: 21, preHolidayDays: 1,
		holidaysAndWeekends: 9, normHours33: 137.6, normHours39: 162.8, normHours40: 167.0,
	},
	7: {
		month: 7, nameRu: "Июль", workingDays: 23, preHolidayDays: 0,
		holidaysAndWeekends: 8, normHours33: 151.8, normHours39: 179.4, normHours40: 184.0,
	},
	8: {
		month: 8, nameRu: "Август", workingDays: 21, preHolidayDays: 0,
		holidaysAndWeekends: 10, normHours33: 138.6, normHours39: 163.8, normHours40: 168.0,
	},
	9: {
		month: 9, nameRu: "Сентябрь", workingDays: 22, preHolidayDays: 0,
		holidaysAndWeekends: 8, normHours33: 145.2, normHours39: 171.6, normHours40: 176.0,
	},
	10: {
		month: 10, nameRu: "Октябрь", workingDays: 22, preHolidayDays: 0,
		holidaysAndWeekends: 9, normHours33: 145.2, normHours39: 171.6, normHours40: 176.0,
	},
	11: {
		month: 11, nameRu: "Ноябрь", workingDays: 20, preHolidayDays: 1,
		holidaysAndWeekends: 10, normHours33: 131.0, normHours39: 155.0, normHours40: 159.0,
	},
	12: {
		month: 12, nameRu: "Декабрь", workingDays: 22, preHolidayDays: 1,
		holidaysAndWeekends: 9, normHours33: 144.2, normHours39: 170.6, normHours40: 175.0,
	},
};
