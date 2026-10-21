/**
 * workflowDateUtils.ts — Date parsing, Russian formatting and working days math.
 */

export function parseDateToMidnight(input: string | Date): Date {
	const d = typeof input === "string" ? new Date(input) : new Date(input.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function formatDateToIsoDay(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatRussianDate(isoString: string): string {
	if (!isoString) return "—";
	const parts = isoString.slice(0, 10).split("-");
	if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
		return `${parts[2]}.${parts[1]}.${parts[0]}`;
	}
	return isoString;
}

/**
 * Добавление рабочих дней с пропуском суббот и воскресений.
 */
export function addWorkingDaysRu(startDate: Date | string, daysToAdd: number): Date {
	const result = parseDateToMidnight(startDate);
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const dayOfWeek = result.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return result;
}
