/**
 * STATUTORY SICK LEAVE DURATION NORMS, LIMITS & DATE CALCULATIONS
 * Conforming to Ministry of Health of the Russian Federation Order № 1089н
 *
 * Domain: Statutory Electronic Sick Leave (ЭЛН) & Medical Commission (ВК)
 */

export const SINGLE_DOCTOR_MAX_DAYS = 15;
export const FELDSHER_MAX_DAYS = 10;
export const DEFAULT_CLINIC_OGRN = '1187746123456';
export const DEFAULT_CLINIC_NAME = 'ООО "ДЕНТЕ КЛИНИК"';
export const DEFAULT_CLINIC_ADDRESS = '127006, г. Москва, ул. Тверская-Ямская, д. 18, стр. 1';
export const DEFAULT_CLINIC_LICENCE = 'ЛО-77-01-020894 от 14.10.2021';

/**
 * Calculates inclusive calendar days between two YYYY-MM-DD dates (inclusive of both start and end date)
 */
export function calculateDaysBetween(from: string, to: string): number {
	if (!from || !to) return 0;
	const dFrom = new Date(from);
	const dTo = new Date(to);
	if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) return 0;
	const diffMs = dTo.getTime() - dFrom.getTime();
	if (diffMs < 0) return 0;
	const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
	return days;
}

/**
 * Formats YYYY-MM-DD to Russian DD.MM.YYYY
 */
export function formatDateRu(dateStr: string): string {
	if (!dateStr) return '';
	const parts = dateStr.split('-');
	if (parts.length !== 3) return dateStr;
	const [year, month, day] = parts;
	return `${day}.${month}.${year}`;
}

/**
 * Adds N calendar days to YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	d.setDate(d.getDate() + days);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Calculates standard date sequence for sick leave
 */
export function calculateSickLeaveDates(startDate: string, durationDays: number) {
	const validDays = Math.max(1, Math.round(durationDays || 1));
	const dateFrom = startDate;
	const dateTo = addDays(startDate, validDays - 1);
	const workResumeDate = addDays(dateTo, 1);
	const nextAppointmentDate = dateTo;

	return {
		dateFrom,
		dateTo,
		totalDays: validDays,
		workResumeDate,
		nextAppointmentDate
	};
}
