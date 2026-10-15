export function parseDateOnly(val?: string | Date | null): Date {
	if (!val) {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}
	const d = typeof val === "string" ? new Date(val) : new Date(val.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function toIsoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function formatRuDate(iso: string): string {
	if (!iso) return "—";
	const p = iso.slice(0, 10).split("-");
	return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

export function addWorkingDaysRu(startDate: Date | string, daysToAdd: number): Date {
	const result = parseDateOnly(startDate);
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

export function calculateLabReadinessDate(
	startDate: Date | string = new Date(),
	turnaroundWorkingDays = 5,
): string {
	const d = addWorkingDaysRu(startDate, Math.max(1, turnaroundWorkingDays));
	return toIsoDate(d);
}
