/**
 * Clinic Onboarding & Rapid Launch Wizard Types
 * DENTE Dental CRM — Mandates 8e (Doctor Autonomy), 8k (Friction Killer), 8n (Solo Doctor Sovereignty)
 */

import type { DentalSpecialty, ServiceCategory } from "../index.js";

export type OnboardingWizardStep = "clinic_profile" | "chairs_schedule" | "starter_pricelist";

export type ClinicOperationalMode =
	| "solo_doctor"
	| "one_chair"
	| "small_clinic"
	| "network_clinic";

export interface StarterDentalService {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly description?: string;
}

export interface DentalChairDraft {
	readonly id: string;
	name: string;
	specialty?: string;
	isDefault?: boolean;
}

export interface ClinicScheduleDraft {
	workdayStart: string;
	workdayEnd: string;
	workingDays: number[];
	defaultVisitMinutes: number;
	appointmentBufferMinutes?: number;
}

export interface ClinicProfileOnboarding {
	clinicName: string;
	phone: string;
	timezone: string;
	mode: ClinicOperationalMode;
	legalName?: string;
	inn?: string;
	address?: string;
}

export interface OnboardingLaunchWizardData {
	step: OnboardingWizardStep;
	currentStepIndex: number;
	totalSteps: number;
	profile: ClinicProfileOnboarding;
	chairs: DentalChairDraft[];
	schedule: ClinicScheduleDraft;
	selectedServiceCodes: string[];
	isCompleted: boolean;
	isSkipped: boolean;
	completedAt?: string | null;
}
