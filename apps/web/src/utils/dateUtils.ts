export function currentLocalDateTimeInputValue(): string {
	const now = new Date();
	const offsetMs = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
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

export function toDateTimeLocalValue(
	value: string,
	timeZone?: string | null,
): string {
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
	const zoned = timeZoneDateParts(value, timeZone);
	if (zoned) return zoned;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value.slice(0, 16);
	const local = new Date(
		parsed.getTime() - parsed.getTimezoneOffset() * 60_000,
	);
	return local.toISOString().slice(0, 16);
}
