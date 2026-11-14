import type { Dashboard, StaffRole } from "@dental/shared";

export interface ShiftViewStats {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly inProgressCount?: number;
	readonly totalRevenueRub: number;
	readonly plannedRevenueRub?: number;
	readonly directPaymentsRub?: number;
	readonly appointmentBilledRub?: number;
	readonly cashBreakdown?: {
		readonly cashRub: number;
		readonly cardRub: number;
		readonly sbpRub: number;
		readonly depositRub: number;
	};
	readonly doctorCommissionPct?: number;
	readonly estimatedDoctorPayoutRub?: number;
	readonly hasActiveOvertime?: boolean;
}

export interface ShiftDashboardRuntimeMeta {
	readonly activeDoctor?: {
		readonly fullName?: string;
		readonly specialty?: string;
	};
	readonly activeAppointment?: {
		readonly doctorId?: string;
		readonly doctorName?: string;
	};
	readonly shiftNumber?: number;
	readonly shiftOpenedAt?: string;
}

export function getDashboardRuntimeMeta(dashboard: Dashboard | undefined): ShiftDashboardRuntimeMeta | null {
	if (!dashboard || typeof dashboard !== "object") return null;
	return dashboard as unknown as ShiftDashboardRuntimeMeta;
}

export function getAppointmentCabinetName(appointment: unknown, defaultName = "Кабинет №1"): string {
	if (!appointment || typeof appointment !== "object") return defaultName;
	const candidate = appointment as Record<string, unknown>;
	if (typeof candidate.cabinetName === "string" && candidate.cabinetName.trim()) {
		return candidate.cabinetName.trim();
	}
	if (typeof candidate.room === "string" && candidate.room.trim()) {
		return candidate.room.trim();
	}
	return defaultName;
}

export interface ShiftCloseSummary {
	readonly calculatedPayoutRub?: number;
	readonly countedCashRub?: number;
	readonly printZReport?: boolean;
}

export interface ShiftRecommendedAction {
	readonly patientId?: string;
	readonly section?: string;
	readonly [key: string]: unknown;
}

export type ShiftViewProps = {
	activePatientHasCallablePhone?: boolean;
	activePatientCallablePhone?: string | null;
	visibleRecommendedActions?: readonly unknown[];
	recommendedActionPriorityLabels?: Record<string, string>;
	staffRoleLabels?: Record<string, string>;
	dashboard?: Dashboard;
	forceMobile?: boolean;
	activeQueueRole?: unknown;
	setError?: (err: unknown) => void;
	mostLoadedResource?: unknown;
	setSelectedPatientId?: (id: string | null) => void;
	onSelectAppointment?: (appointmentId: string) => void;
	onUpdateAppointmentStatus?: (appointmentId: string, status: string) => void;
	selectedWorkspaceRole?: StaffRole | string;
	[key: string]: unknown;
};

export type CockpitPatient = Dashboard["patients"][number];
export type CockpitPatientInsight = Dashboard["patientInsights"][number];

export type PatientCockpitProps = {
	activePatient: CockpitPatient | null | undefined;
	activePatientInsight: CockpitPatientInsight | null | undefined;
	dashboard: Dashboard | null | undefined;
	activeCommunicationTasks: readonly unknown[];
	activeImagingStudies: readonly unknown[];
	activeUsableDocuments: readonly unknown[];
};

export type ShiftFinancialMode = "piece_rate" | "chair_rental" | "standard";

export interface ShiftMetricsHeaderProps {
	doctorName: string;
	cabinetName: string;
	isShiftOpen: boolean;
	onToggleShift: () => void;
	onOpenPayrollModal: () => void;
	onOpenT13Timesheet: () => void;
	shiftStats: ShiftViewStats;
	financialMode: ShiftFinancialMode;
	onChangeFinancialMode: (mode: ShiftFinancialMode) => void;
	chairRentalNetIncomeRub: number;
	chairRentalRentExpenseRub: number;
	onOpenChairRentalAct: () => void;
}

export interface ShiftVisitsQueueProps {
	todayAppointments: readonly unknown[];
	inChairAppointments: readonly unknown[];
	waitingAppointments: readonly unknown[];
	awaitingPaymentAppointments: readonly unknown[];
	patientsById: Map<string, unknown>;
	staffById: Map<string, unknown>;
	currentPatient: unknown;
	inChairAppointment: unknown;
	manyDoctors: boolean;
	onSelectPatient: (patientId: string) => void;
	onOpenAppointmentEmk: (patientId: string) => void;
	onOpenCashier: (patientId: string) => void;
	onOpenQueueBoardModal: () => void;
	onOpenSchedule: () => void;
}

export interface ShiftChairStatusCardProps {
	inChairAppointment: unknown;
	doctorFullName: string;
	cabinetName?: string;
	isSterilized?: boolean;
	assistantReady?: boolean;
	currentPatient?: unknown;
	currentPatientHasCallablePhone?: boolean;
	currentPatientCallablePhone?: string | null;
	currentAppointmentReason?: string;
	nextAppointment?: unknown;
	nextAppointmentPatient?: unknown;
	todayAppointmentsCount?: number;
	formatClockTime?: (isoString?: string) => string;
	onOpenVisit?: (patientId: string) => void;
	onOpenImaging?: (patientId: string) => void;
	onCallPatientError?: (msg: string) => void;
	onStartNextAppointment?: (patientId: string) => void;
	onOpenSchedule?: () => void;
	onConfirmHandover?: ((notes?: string) => void) | undefined;
	showHandoverBar?: boolean | undefined;
}
