import {
	formatGoogleDate,
	formatIcsDate,
	formatYandexDate,
} from "../../../utils/formatters";

export function generateBookingReference(): string {
	const currentYear = new Date().getFullYear();
	let rand4 = 1000 + (Date.now() % 9000);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const ubuf = new Uint32Array(1);
		crypto.getRandomValues(ubuf);
		rand4 = 1000 + ((ubuf[0] ?? 0) % 9000);
	}
	return `DNT-${currentYear}-${rand4}`;
}

export function generateIcsCalendarContent(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const startStr = formatIcsDate(event.startsAt);
	const endStr = formatIcsDate(event.endsAt);
	const nowStr = formatIcsDate(new Date());
	const uid = `dente-${Date.now()}@dente.clinic`;

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Online Booking//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${nowStr}`,
		`DTSTART:${startStr}`,
		`DTEND:${endStr}`,
		`SUMMARY:${event.title}`,
		`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
		`LOCATION:${event.location}`,
		"STATUS:CONFIRMED",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

export function generateGoogleCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		details: event.description,
		location: event.location,
		dates: `${formatGoogleDate(event.startsAt)}/${formatGoogleDate(event.endsAt)}`,
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateYandexCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const params = new URLSearchParams({
		name: event.title,
		description: event.description,
		location: event.location,
		start_ts: formatYandexDate(event.startsAt),
		end_ts: formatYandexDate(event.endsAt),
	});
	return `https://calendar.yandex.ru/event/new?${params.toString()}`;
}

export function generateEmbedSnippet(options: {
	clinicId?: string | null;
	primaryColor?: string;
	theme?: string;
}): string {
	const clinic = options.clinicId || "DEMO_CLINIC_ID";
	const color = options.primaryColor || "#0d9488";
	const theme = options.theme || "auto";

	return `<!-- DENTE Online Booking Widget Embed -->
<div id="dente-booking-container" data-clinic-id="${clinic}"></div>
<script 
  src="https://crm.dente.ru/widget/booking.js" 
  data-clinic-id="${clinic}" 
  data-primary-color="${color}" 
  data-theme="${theme}" 
  async>
</script>`;
}
