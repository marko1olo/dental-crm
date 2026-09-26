/**
 * publicBookingEngine.ts — High-Performance Pure Online Booking Engine
 * Supports 24/7 Offline Holding Queue, Flash-Call / SMS verification,
 * Telegram Mini App detection, and Embed postMessage dispatching.
 *
 * Mandates 8b (<=800 lines), 8c (Density), 8d (Zero emojis), 8e (Autonomy), 8n (Solo Doctor).
 */

export type BookingStep = "doctor" | "slot" | "contacts" | "confirmation";

export type VerificationMethod = "sms" | "flash_call";

export interface BookingDoctor {
	id: string;
	fullName: string;
	specialties: string[];
	categoryIds: string[];
	experienceYears?: number;
	rating?: number;
	reviewsCount?: number;
	avatarUrl?: string;
	isAvailable?: boolean;
}

export interface BookingSlot {
	time: string; // e.g. "10:30"
	startsAt: string; // ISO 8601
	endsAt: string; // ISO 8601
	availableDoctorIds?: string[];
	period?: "morning" | "afternoon" | "evening";
}

export interface BookingContacts {
	patientName: string;
	patientPhone: string;
	verificationCode: string;
	verificationMethod: VerificationMethod;
	comment: string;
}

export interface BookingReceiptData {
	bookingId: string;
	referenceNumber: string;
	status: "CONFIRMED" | "PENDING_RESERVATION";
	isNightMode: boolean;
	message: string;
	doctorName: string;
	specialty?: string;
	date: string;
	time: string;
	morningConfirmTime?: string;
	clinicAddress?: string;
	patientName: string;
	patientPhone: string;
	createdAt: string;
}

export interface CalendarExportPayload {
	title: string;
	description: string;
	location?: string;
	startsAt: string; // ISO
	endsAt: string; // ISO
}

export const DEFAULT_DOCTORS_LIST: BookingDoctor[] = [
	{
		id: "doc-solo-default",
		fullName: "Барабаш Сергей Васильевич",
		specialties: ["Главный врач", "Стоматолог-терапевт", "Ортопед"],
		categoryIds: ["therapy", "orthopedics"],
		experienceYears: 14,
		rating: 4.95,
		reviewsCount: 142,
		isAvailable: true,
	},
	{
		id: "doc-surgeon-default",
		fullName: "Смирнова Елена Александровна",
		specialties: ["Хирург-имплантолог", "Пародонтолог"],
		categoryIds: ["surgery", "periodontics"],
		experienceYears: 11,
		rating: 4.98,
		reviewsCount: 98,
		isAvailable: true,
	},
	{
		id: "doc-orthodontist-default",
		fullName: "Волков Артём Николаевич",
		specialties: ["Ортодонт"],
		categoryIds: ["orthodontics"],
		experienceYears: 8,
		rating: 4.91,
		reviewsCount: 76,
		isAvailable: true,
	},
	{
		id: "doc-hygienist-default",
		fullName: "Кузнецова Ирина Викторовна",
		specialties: ["Гигиенист стоматологический"],
		categoryIds: ["hygiene"],
		experienceYears: 6,
		rating: 4.88,
		reviewsCount: 54,
		isAvailable: true,
	},
];

export const SERVICE_CATEGORIES = [
	{ id: "all", label: "Все специалисты" },
	{ id: "therapy", label: "Терапия и лечение" },
	{ id: "orthopedics", label: "Коронки и виниры" },
	{ id: "surgery", label: "Хирургия и имплантация" },
	{ id: "orthodontics", label: "Брекеты и элайнеры" },
	{ id: "hygiene", label: "Чистка и профилактика" },
];

/**
 * Normalizes phone string to clean Russian digits (10 or 11 digits).
 */
export function normalizePhoneDigits(phone: string): string {
	const digits = String(phone ?? "").replace(/\D/g, "");
	if (digits.startsWith("8") && digits.length === 11) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

/**
 * Formats user input as Russian phone number: +7 (999) 000-00-00
 */
export function formatPhoneRu(value: string): string {
	const digits = value.replace(/\D/g, "");
	let clean = digits;
	if (clean.startsWith("7") || clean.startsWith("8")) {
		clean = clean.slice(1);
	}
	clean = clean.slice(0, 10);

	if (clean.length === 0) return "";
	if (clean.length <= 3) return `+7 (${clean}`;
	if (clean.length <= 6) return `+7 (${clean.slice(0, 3)}) ${clean.slice(3)}`;
	if (clean.length <= 8) {
		return `+7 (${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
	}
	return `+7 (${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 10)}`;
}

/**
 * Validates Russian mobile number (10 national digits).
 */
export function isValidRuPhone(phone: string): boolean {
	const clean = normalizePhoneDigits(phone);
	const last10 = clean.slice(-10);
	return last10.length === 10 && last10.startsWith("9");
}

/**
 * Validates patient full name.
 */
export function isValidPatientName(name: string): boolean {
	const trimmed = name.trim();
	return trimmed.length >= 2 && trimmed.length <= 100;
}

/**
 * Detects whether the current time is considered nighttime/offline for clinic booking
 * (e.g. 21:00 to 08:30).
 */
export function isClinicNightTime(
	now: Date = new Date(),
	openHour = 8.5,
	closeHour = 21.0,
): boolean {
	const currentHour = now.getHours() + now.getMinutes() / 60;
	return currentHour < openHour || currentHour >= closeHour;
}

/**
 * Groups slots into Morning (before 12:00), Afternoon (12:00-17:00), and Evening (17:00+).
 */
export function groupSlotsByDayPeriod(slots: BookingSlot[]): {
	morning: BookingSlot[];
	afternoon: BookingSlot[];
	evening: BookingSlot[];
} {
	const morning: BookingSlot[] = [];
	const afternoon: BookingSlot[] = [];
	const evening: BookingSlot[] = [];

	for (const slot of slots) {
		const hour = Number.parseInt(slot.time.split(":")[0] ?? "12", 10);
		if (hour < 12) {
			morning.push({ ...slot, period: "morning" });
		} else if (hour < 17) {
			afternoon.push({ ...slot, period: "afternoon" });
		} else {
			evening.push({ ...slot, period: "evening" });
		}
	}

	return { morning, afternoon, evening };
}

/**
 * Generates local date string YYYY-MM-DD
 */
export function toLocalDateString(d: Date = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Formats Russian date display: "Понедельник, 28 сентября"
 */
export function formatRussianDate(dateStr: string): string {
	try {
		const [y, m, d] = dateStr.split("-").map(Number);
		if (!y || !m || !d) return dateStr;
		const dateObj = new Date(y, m - 1, d);
		return dateObj.toLocaleDateString("ru-RU", {
			weekday: "long",
			day: "numeric",
			month: "long",
		});
	} catch {
		return dateStr;
	}
}

/**
 * Detects Telegram Mini App environment
 */
export function detectTelegramWebApp(): {
	isTelegram: boolean;
	user?: { id: number; firstName: string; username?: string };
} {
	if (typeof window === "undefined") {
		return { isTelegram: false };
	}
	// biome-ignore lint/suspicious/noExplicitAny: Telegram global check
	const tg = (window as any)?.Telegram?.WebApp;
	if (tg) {
		tg.ready?.();
		tg.expand?.();
		const user = tg.initDataUnsafe?.user;
		return {
			isTelegram: true,
			user: user
				? {
						id: user.id,
						firstName: user.first_name,
						username: user.username,
					}
				: undefined,
		};
	}
	return { isTelegram: false };
}

/**
 * Dispatches postMessage event to parent frame (for Tilda, WordPress, HTML embedding).
 */
export function dispatchBookingCompletedMessage(
	data: BookingReceiptData,
): void {
	if (typeof window !== "undefined" && window.parent && window.parent !== window) {
		try {
			window.parent.postMessage(
				{
					type: "DENTE_BOOKING_COMPLETED",
					payload: data,
				},
				"*",
			);
		} catch (err) {
			console.warn("[publicBookingEngine] postMessage dispatch failed:", err);
		}
	}
}

/**
 * Generates Google Calendar event creation URL
 */
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

/**
 * Generates Yandex Calendar event creation URL
 */
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

/**
 * Generates iCalendar (.ics) content string
 */
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

/**
 * Generates a mock schedule of slots for testing or when API is unreachable.
 */
export function generateFallbackSlots(selectedDate: string): BookingSlot[] {
	const times = [
		"09:00",
		"09:30",
		"10:00",
		"10:30",
		"11:00",
		"11:30",
		"12:30",
		"13:00",
		"14:00",
		"15:00",
		"15:30",
		"16:30",
		"17:00",
		"18:00",
		"19:00",
	];

	return times.map((time) => {
		const [hh, mm] = time.split(":").map(Number);
		const start = new Date(`${selectedDate}T${time}:00+03:00`);
		const end = new Date(start.getTime() + 30 * 60_000);
		return {
			time,
			startsAt: start.toISOString(),
			endsAt: end.toISOString(),
			period: (hh ?? 12) < 12 ? "morning" : (hh ?? 12) < 17 ? "afternoon" : "evening",
		};
	});
}
