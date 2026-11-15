/**
 * DENTE CRM — Patient Header Types & Utilities
 * (DOMAIN: macOS/iOS Clinical HIG, Patient Profile Header)
 */

import type { Patient } from "@dental/shared";

export interface PatientHeaderAppointment {
	startsAt?: string | null | undefined;
	status?: string | null | undefined;
}

export interface PatientHeaderRecord extends Partial<Patient> {
	id: string;
	fullName: string;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	hasSignedContract?: boolean | undefined;
	contractStatus?: "issued" | "draft" | "none" | string | undefined;
	hasSignedConsent?: boolean | undefined;
	consentStatus?: "issued" | "draft" | "none" | string | undefined;
	cardNumber?: string | number | undefined;
	medicalCardNumber?: string | number | undefined;
	allergies?: string | null | undefined;
	anamnesis?: {
		allergies?: string | null | undefined;
		clinicalSafetyProfile?: Record<string, unknown> | null | undefined;
	} | null | undefined;
}

export interface PatientHeaderCardProps {
	patientId?: string | null | undefined;
	patient?: PatientHeaderRecord | Patient | null | undefined;
	onEditPatient?: (() => void) | undefined;
	onOpenAnamnesis?: (() => void) | undefined;
	className?: string | undefined;
}

export interface SomaticFlagItem {
	id: string;
	titleRu?: string | undefined;
	shortBadge?: string | undefined;
	description?: string | undefined;
	category?: string | undefined;
}

export interface PatientHeaderQuickActionsProps {
	resolvedPatient: PatientHeaderRecord | Patient;
	fullName: string;
	phone: string;
	clinicLegalName?: string | undefined;
	onOpenAnamnesis?: (() => void) | undefined;
	onEditPatient?: (() => void) | undefined;
	onOpenFamilyWallet: () => void;
	isActiveVisit: boolean;
	nextAppointment?: PatientHeaderAppointment | null | undefined;
}

export function formatPatientBirthAndAge(birthDateIso?: string | null): string {
	if (!birthDateIso) return "";
	const date = new Date(birthDateIso);
	if (Number.isNaN(date.getTime())) return "";

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const m = today.getMonth() - date.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
		age--;
	}

	const dateStr = date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	let ageWord = "лет";
	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		ageWord = "лет";
	} else if (lastDigit === 1) {
		ageWord = "год";
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		ageWord = "года";
	}

	return `${dateStr} (${age} ${ageWord})`;
}
