export const MONTH_NAMES_RU = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function computeWorkingDates(
	year: number,
	month: number,
	includeSaturdays = true,
	includeSundays = false,
): string[] {
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const daysInMonth = new Date(year, month, 0).getDate();
	const workingDates: string[] = [];

	for (let d = 1; d <= daysInMonth; d++) {
		const dateObj = new Date(year, month - 1, d);
		const dayOfWeek = dateObj.getDay();
		const isSunday = dayOfWeek === 0;
		const isSaturday = dayOfWeek === 6;

		if (isSunday && !includeSundays) continue;
		if (isSaturday && !includeSaturdays) continue;

		workingDates.push(`${year}-${pad2(month)}-${pad2(d)}`);
	}

	return workingDates;
}
