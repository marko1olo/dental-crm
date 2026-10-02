/**
 * DENTE Dental CRM — Online Booking Utilities & Contracts
 *
 * Extracted per Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import React from "react";
import {
	Activity,
	Scissors,
	Smile,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import type { BookingDoctorData } from "./BookingDoctorCard";
import type { BookingSlotItem, CalendarDayItem } from "./BookingSlotPicker";
import {
	formatGoogleDate,
	formatIcsDate,
	formatRussianDate as canonicalFormatRussianDate,
	formatRussianPhone as canonicalFormatRussianPhone,
	formatYandexDate,
	isValidRussianPhone as canonicalIsValidRussianPhone,
	localDateString as canonicalLocalDateString,
} from "../../utils/formatters";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface ClinicBranch {
	id: string;
	name: string;
	address: string;
	metro?: string;
	phone: string;
	workHours: string;
	isMain?: boolean;
}

export interface PopularService {
	id: string;
	title: string;
	durationMinutes: number;
	priceFormatted: string;
	description?: string;
}

export interface ServiceCategory {
	id: string;
	title: string;
	iconName: "Stethoscope" | "Sparkles" | "Scissors" | "Smile" | "Activity";
	description: string;
	popularServices: PopularService[];
}

export interface BookingConfirmationData {
	referenceNumber: string;
	branch?: ClinicBranch | undefined;
	category?: ServiceCategory | undefined;
	service?: PopularService | undefined;
	doctor: BookingDoctorData;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	startsAt: string;
	endsAt: string;
	patientName: string;
	patientPhone: string;
	cabinetNumber?: string | undefined;
	comment?: string | undefined;
	createdAt: string;
}

export interface PublicOnlineBookingWidgetProps {
	/** Organization ID for real API integration */
	readonly organizationId?: string | null;
	/** Optional title override */
	readonly title?: string;
	/** Optional subtitle override */
	readonly subtitle?: string;
	/** Theme mode: light, dark, night, calm_teal, auto */
	readonly theme?: "light" | "dark" | "night" | "calm_teal" | "contrast" | "auto";
	/** Embed mode: standalone, iframe, modal, or telegram */
	readonly embedMode?: "standalone" | "iframe" | "modal" | "telegram";
	/** Custom branches override */
	readonly customBranches?: ClinicBranch[] | undefined;
	/** Custom categories override */
	readonly customCategories?: ServiceCategory[] | undefined;
	/** Custom doctors override */
	readonly customDoctors?: BookingDoctorData[] | undefined;
	/** Initial step (1-5) */
	readonly initialStep?: number | undefined;
	/** Initial branch ID */
	readonly initialBranchId?: string | undefined;
	/** Initial category ID */
	readonly initialCategoryId?: string | undefined;
	/** Initial doctor ID */
	readonly initialDoctorId?: string | undefined;
	/** Callback when booking succeeds */
	readonly onSuccess?: ((booking: BookingConfirmationData) => void) | undefined;
	/** Callback when step changes */
	readonly onStepChange?: ((step: number) => void) | undefined;
	/** Optional active toast/guidance notification callback */
	readonly showToast?:
		| ((
				message: string,
				type?: "info" | "warning" | "error" | "success",
		  ) => void)
		| undefined;
	/** Base URL for API fetch */
	readonly apiBaseUrl?: string | undefined;
	/** Require SMS verification before booking (clinic settings, default false) */
	readonly requireSmsVerification?: boolean | undefined;
	/** Additional CSS class */
	readonly className?: string | undefined;
	/** Pre-filled patient name (e.g. from patient portal / auth session) */
	readonly initialPatientName?: string | undefined;
	/** Pre-filled patient phone */
	readonly initialPatientPhone?: string | undefined;
	/** Patient ID if already authenticated in patient portal */
	readonly patientId?: string | undefined;
	/** Compatibility flags */
	readonly rapidFlow?: boolean | undefined;
	readonly flowMode?: "standard" | "rapid_solo" | undefined;
	/** Optional atmospheric art background with glass surface (Mandates 8p, 8n) */
	readonly artBackground?: boolean | undefined;
	/** Compact mode for narrow sidebars or widgets */
	readonly compact?: boolean | undefined;
}

// Clean non-mock fallbacks without hardcoded city data (Mandate 8a & 8k: Zero Mocks)
export const DEFAULT_BRANCHES: ClinicBranch[] = [];
export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [];
export const DEFAULT_DOCTORS: BookingDoctorData[] = [];

// ============================================================================
// Utilities
// ============================================================================

export const localDateString = canonicalLocalDateString;

export function formatRussianDate(isoDateString: string): string {
	return canonicalFormatRussianDate(isoDateString, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export const formatRussianPhone = canonicalFormatRussianPhone;
export const isValidRussianPhone = canonicalIsValidRussianPhone;

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

export function resolveCategoryIcon(iconName: string): React.ReactElement {
	switch (iconName) {
		case "Stethoscope":
			return React.createElement(Stethoscope, { size: 22 });
		case "Sparkles":
			return React.createElement(Sparkles, { size: 22 });
		case "Scissors":
			return React.createElement(Scissors, { size: 22 });
		case "Smile":
			return React.createElement(Smile, { size: 22 });
		case "Activity":
		default:
			return React.createElement(Activity, { size: 22 });
	}
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

export function buildCalendarDays(
	calendarMonth: Date,
	selectedDate: string,
	todayDateStr: string,
): CalendarDayItem[] {
	const year = calendarMonth.getFullYear();
	const month = calendarMonth.getMonth();

	const firstDayOfMonth = new Date(year, month, 1);
	const lastDayOfMonth = new Date(year, month + 1, 0);

	const daysInMonth = lastDayOfMonth.getDate();
	let startDayIndex = firstDayOfMonth.getDay() - 1;
	if (startDayIndex === -1) startDayIndex = 6;

	const daysArray: CalendarDayItem[] = [];

	const prevMonthLastDay = new Date(year, month, 0).getDate();
	for (let i = startDayIndex - 1; i >= 0; i--) {
		const dayNum = prevMonthLastDay - i;
		const pMonth = month === 0 ? 11 : month - 1;
		const pYear = month === 0 ? year - 1 : year;
		const dStr = `${pYear}-${String(pMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
		daysArray.push({
			dayNumber: dayNum,
			dateStr: dStr,
			isCurrentMonth: false,
			isPast: true,
			isToday: false,
			isSelected: false,
		});
	}

	for (let d = 1; d <= daysInMonth; d++) {
		const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		const isToday = dStr === todayDateStr;
		const isPast = dStr < todayDateStr;
		const isSelected = dStr === selectedDate;

		daysArray.push({
			dayNumber: d,
			dateStr: dStr,
			isCurrentMonth: true,
			isPast,
			isToday,
			isSelected,
		});
	}

	return daysArray;
}

