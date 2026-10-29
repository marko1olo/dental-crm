import type { Appointment, Patient, PatientInsight } from "@dental/shared";

export type ReliabilityCategory = "reliable" | "attention" | "risk" | "new";
export type ReliabilityStatus = "reliable" | "new" | "high_risk" | "attention" | "debt";

export interface PatientReliabilityBadge {
	readonly category: ReliabilityCategory;
	readonly status: ReliabilityStatus;
	readonly badgeText: string;
	readonly shortLabel: string;
	readonly emoji: string;
	readonly recommendation: string;
	readonly summary: string;
	readonly badgeClass: string;
	readonly requiresTwoHourConfirmation: boolean;
}

export interface PatientFinancialBadge {
	readonly balanceRub: number;
	readonly status: "debt" | "deposit" | "settled";
	readonly label: string;
	readonly shortLabel: string;
	readonly formattedAmount: string;
	readonly badgeClass: string;
	readonly isDebt: boolean;
	readonly isDeposit: boolean;
}

export interface PatientVisitHistoryStats {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly noShowCount: number;
	readonly cancelledCount: number;
	readonly lateCount: number;
	readonly consecutiveNoShows: number;
	readonly maxConsecutiveNoShows: number;
	readonly onTimeRatePercent: number;
	readonly attendanceRatePercent: number;
}

export interface ClassifierParams {
	totalFinished: number; completedCount: number; noShowCount: number;
	consecutiveNoShows: number; maxConsecutiveNoShows: number; lateCount: number;
	cancelledCount: number; attendanceRatePercent: number; onTimeRatePercent: number;
	isInsightHighRisk: boolean;
}

export interface PatientReliabilityAssessment {
	readonly patientId: string;
	readonly score: number; // 0..100
	readonly category: ReliabilityCategory;
	readonly stats: PatientVisitHistoryStats;
	readonly reliabilityBadge: PatientReliabilityBadge;
	readonly financialBadge: PatientFinancialBadge;
	readonly flags: readonly string[];
	readonly receptionistAlert?: string | undefined;
}

export interface ReliabilityCalculationOptions {
	readonly referenceTimeIso?: string | undefined;
	readonly latenessThresholdMinutes?: number | undefined;
	readonly overrideInsight?: PatientInsight | null | undefined;
}

export interface DurationPreset {
	readonly minutes: number;
	readonly label: string;
	readonly serviceHint: string;
}

export const DURATION_PRESETS: readonly DurationPreset[] = [
	{ minutes: 15, label: "15 мин", serviceHint: "Осмотр" },
	{ minutes: 30, label: "30 мин", serviceHint: "Терапия" },
	{ minutes: 45, label: "45 мин", serviceHint: "Терапия" },
	{ minutes: 60, label: "60 мин", serviceHint: "Эндо/Коронка" },
	{ minutes: 90, label: "90 мин", serviceHint: "Хирургия/Имплантация" },
	{ minutes: 120, label: "120 мин", serviceHint: "Ортопедия" },
];

export type QuickBookingAppointmentType = "primary" | "secondary" | "emergency";

export interface AppointmentTypePreset {
	readonly type: QuickBookingAppointmentType;
	readonly label: string;
	readonly description: string;
	readonly defaultReason: string;
	readonly defaultDurationMinutes: number;
	readonly defaultStatus: Appointment["status"];
	readonly isEmergency: boolean;
}

export const APPOINTMENT_TYPE_PRESETS: readonly AppointmentTypePreset[] = [
	{
		type: "primary", label: "Первичный", description: "Осмотр и консультация",
		defaultReason: "Первичный осмотр", defaultDurationMinutes: 30,
		defaultStatus: "planned", isEmergency: false,
	},
	{
		type: "secondary", label: "Повторный", description: "Лечение по плану",
		defaultReason: "Повторный прием (Лечение)", defaultDurationMinutes: 60,
		defaultStatus: "planned", isEmergency: false,
	},
	{
		type: "emergency", label: "Острая боль", description: "Срочный приём (CITO)",
		defaultReason: "Срочно! Острая боль", defaultDurationMinutes: 30,
		defaultStatus: "confirmed", isEmergency: true,
	},
];
