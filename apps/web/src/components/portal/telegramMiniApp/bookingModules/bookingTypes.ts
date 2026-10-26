/**
 * TELEGRAM MINI APP BOOKING — TYPES
 * (DOMAIN: Telegram WebApp, Booking Protocol, Doctor Profiles, Calendar Steps)
 */

import type { ToothComplaint } from "../TelegramInteractiveToothPicker";

export type SpecialistCategory = "therapist" | "surgeon" | "orthodontist" | "hygienist";

export interface DoctorProfile {
	id: string;
	name: string;
	specialty: string;
	category: SpecialistCategory;
	experience: string;
	initials: string;
	rating: number;
}

export interface CalendarDayItem {
	index: number;
	dateString: string;
	dayOfWeek: string;
	dayNum: number;
	month: string;
}

export interface BookingSuccessResult {
	appointmentId: string;
	doctorName: string;
	dateString: string;
	time: string;
	teethSummary: string;
}

export interface TelegramMiniAppBookingProps {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly attachedComplaints: readonly ToothComplaint[];
	readonly onBackToTeeth?: () => void;
	readonly onBookingComplete?: (
		appointmentId: string,
		createdAppointment?: {
			id: string;
			dateStr: string;
			timeStr: string;
			doctorName: string;
			doctorRole: string;
			cabinet: string;
			procedureTitle: string;
			durationMinutes: number;
			isConfirmed: boolean;
			isPast: boolean;
			toothNumber?: number | undefined;
		},
	) => void;
}

export {
	SPECIALIST_CATEGORIES,
	DEFAULT_DOCTORS_LIST,
	generateCalendarDays,
} from "./bookingConstants";
