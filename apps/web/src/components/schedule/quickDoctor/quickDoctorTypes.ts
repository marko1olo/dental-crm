/**
 * quickDoctorTypes.ts — Types and constants for QuickAddDoctorModal.
 */

import type { DentalSpecialty, StaffRole } from "@dental/shared";

export interface DoctorSpecialtyOption {
	id: DentalSpecialty;
	label: string;
}

export const QUICK_DOCTOR_SPECIALTIES: readonly DoctorSpecialtyOption[] = [
	{ id: "therapist", label: "Терапевт" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "surgeon", label: "Хирург-имплантолог" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "periodontist", label: "Пародонтолог" },
	{ id: "pediatric", label: "Детский стоматолог" },
	{ id: "hygienist", label: "Гигиенист" },
] as const;

export interface DoctorColorPreset {
	id: string;
	label: string;
	hex: string;
}

export const DOCTOR_COLOR_PRESETS: readonly DoctorColorPreset[] = [
	{ id: "teal", label: "Бирюзовый", hex: "#0d9488" },
	{ id: "sapphire", label: "Сапфировый", hex: "#2563eb" },
	{ id: "emerald", label: "Изумрудный", hex: "#059669" },
	{ id: "indigo", label: "Индиго", hex: "#4f46e5" },
	{ id: "amber", label: "Янтарный", hex: "#d97706" },
	{ id: "coral", label: "Коралловый", hex: "#e11d48" },
	{ id: "amethyst", label: "Аметистовый", hex: "#7c3aed" },
	{ id: "azure", label: "Лазурный", hex: "#0284c7" },
	{ id: "mint", label: "Мятный", hex: "#10b981" },
	{ id: "rose", label: "Розовый", hex: "#db2777" },
] as const;

export const DOCTOR_COLOR_PALETTE = DOCTOR_COLOR_PRESETS;

export function formatDoctorShortName(fullName: string): string {
	if (!fullName) return "";
	const cleaned = fullName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = cleaned.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return fullName;
	const lastName = parts[0];
	if (parts.length === 1) return lastName;
	if (parts[1]?.includes(".")) {
		return `${lastName} ${parts.slice(1).join(" ")}`.trim();
	}
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const middleInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${middleInitial}`.trim();
}

export interface QuickAddDoctorData {
	id?: string;
	fullName: string;
	name?: string;
	shortName: string;
	specialty: DentalSpecialty;
	specialtyLabel: string;
	phone?: string | null;
	preferredChairId?: string | null;
	color: string;
	role?: StaffRole;
	active?: boolean;
}

export interface QuickAddDoctorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAddDoctor?: ((doctorData: QuickAddDoctorData) => Promise<void> | void) | undefined;
	readonly onDoctorAdded?: ((doctorData: QuickAddDoctorData) => Promise<void> | void) | undefined;
	readonly chairs?: Array<{ id: string; name: string; room?: string | null; active?: boolean }> | undefined;
	readonly existingDoctorsCount?: number | undefined;
	readonly defaultChairId?: string | null | undefined;
}
