export function formatTime(value: string) {
	return new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Samara",
	}).format(new Date(value));
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
