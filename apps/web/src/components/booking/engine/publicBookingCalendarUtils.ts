import type { CalendarExportPayload } from "../contracts/publicBookingContracts";

export function generateGoogleCalendarUrl(payload: CalendarExportPayload): string {
	const fmtTime = (iso: string) =>
		new Date(iso).toISOString().replace(/-|:|\.\d\d\d/g, "");

	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: payload.title,
		details: payload.description,
		location: payload.location ?? "Стоматологическая клиника",
		dates: `${fmtTime(payload.startsAt)}/${fmtTime(payload.endsAt)}`,
	});

	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateYandexCalendarUrl(payload: CalendarExportPayload): string {
	const fmtTime = (iso: string) =>
		new Date(iso).toISOString().replace(/-|:|\.\d\d\d/g, "");

	const params = new URLSearchParams({
		name: payload.title,
		description: payload.description,
		location: payload.location ?? "Стоматологическая клиника",
		start: fmtTime(payload.startsAt),
		end: fmtTime(payload.endsAt),
	});

	return `https://calendar.yandex.ru/event?${params.toString()}`;
}

export function generateIcsCalendarContent(payload: CalendarExportPayload): string {
	const fmtTime = (iso: string) =>
		new Date(iso).toISOString().replace(/-|:|\.\d\d\d/g, "");

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Online Booking//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${Date.now()}@dente.clinic`,
		`DTSTAMP:${fmtTime(new Date().toISOString())}`,
		`DTSTART:${fmtTime(payload.startsAt)}`,
		`DTEND:${fmtTime(payload.endsAt)}`,
		`SUMMARY:${payload.title}`,
		`DESCRIPTION:${payload.description.replace(/\n/g, "\\n")}`,
		`LOCATION:${payload.location ?? "Стоматологическая клиника"}`,
		"STATUS:CONFIRMED",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}
