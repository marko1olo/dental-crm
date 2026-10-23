import { cleanPhoneDigits } from "../../../utils/formatters";
import type { VerificationMethod } from "../engine/bookingOtpEngine";

export type BookingStep = "doctor" | "slot" | "contacts" | "confirmation";

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

export interface BookingContacts {
	patientName: string;
	patientPhone: string;
	verificationCode: string;
	verificationMethod: VerificationMethod;
	comment: string;
}

export interface CalendarExportPayload {
	title: string;
	description: string;
	location?: string | undefined;
	startsAt: string;
	endsAt: string;
}

export const DEFAULT_DOCTORS_LIST: BookingDoctor[] = [];

export const SERVICE_CATEGORIES = [
	{ id: "all", label: "Все специалисты" },
	{ id: "therapy", label: "Терапия и лечение" },
	{ id: "orthopedics", label: "Коронки и виниры" },
	{ id: "surgery", label: "Хирургия и имплантация" },
	{ id: "orthodontics", label: "Брекеты и элайнеры" },
	{ id: "hygiene", label: "Чистка и профилактика" },
];

/**
 * Validates Russian mobile number (10 national digits).
 */
export function isValidRuPhone(phone: string): boolean {
	const clean = cleanPhoneDigits(phone);
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
