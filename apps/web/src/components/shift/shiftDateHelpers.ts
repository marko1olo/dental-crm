export function localCalendarDateString(date: Date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calendarDateOfInstant(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : localCalendarDateString(parsed);
}

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function formatClockTime(value: unknown): string {
	if (typeof value !== "string" || !value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
