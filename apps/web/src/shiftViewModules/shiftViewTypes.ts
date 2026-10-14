import type { Dashboard } from "@dental/shared";

export type ShiftViewProps = {
	activePatientHasCallablePhone?: boolean;
	activePatientCallablePhone?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	visibleRecommendedActions?: any[];
	recommendedActionPriorityLabels?: Record<string, string>;
	staffRoleLabels?: Record<string, string>;
	dashboard?: Dashboard;
	forceMobile?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeQueueRole?: any;
	setError?: (err: unknown) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mostLoadedResource?: any;
	setSelectedPatientId?: (id: string | null) => void;
	// biome-ignore lint/suspicious/noExplicitAny: allow extra props
	[key: string]: any;
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

export type ShiftFinancialMode = "piece_rate" | "chair_rental";

export interface ShiftMetricsHeaderProps {
	doctorName: string;
	cabinetName: string;
	isShiftOpen: boolean;
	onToggleShift: () => void;
	onOpenPayrollModal: () => void;
	onOpenT13Timesheet: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: shift stats shape
	shiftStats: any;
	financialMode: ShiftFinancialMode;
	onChangeFinancialMode: (mode: ShiftFinancialMode) => void;
	chairRentalNetIncomeRub: number;
	chairRentalRentExpenseRub: number;
	onOpenChairRentalAct: () => void;
}

export interface ShiftVisitsQueueProps {
	// biome-ignore lint/suspicious/noExplicitAny: appointments array
	todayAppointments: any[];
	// biome-ignore lint/suspicious/noExplicitAny: appointments array
	inChairAppointments: any[];
	// biome-ignore lint/suspicious/noExplicitAny: appointments array
	waitingAppointments: any[];
	// biome-ignore lint/suspicious/noExplicitAny: appointments array
	awaitingPaymentAppointments: any[];
	// biome-ignore lint/suspicious/noExplicitAny: patient map
	patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: staff map
	staffById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: patient object
	currentPatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment object
	inChairAppointment: any;
	manyDoctors: boolean;
	onSelectPatient: (patientId: string) => void;
	onOpenAppointmentEmk: (patientId: string) => void;
	onOpenCashier: (patientId: string) => void;
	onOpenQueueBoardModal: () => void;
	onOpenSchedule: () => void;
}

export interface ShiftChairStatusCardProps {
	// biome-ignore lint/suspicious/noExplicitAny: appointment object
	inChairAppointment: any;
	doctorFullName: string;
	cabinetName?: string;
	nextDoctorName?: string;
	isSterilized?: boolean;
	assistantReady?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: patient object
	currentPatient?: any;
	currentPatientHasCallablePhone?: boolean;
	currentPatientCallablePhone?: string | null;
	currentAppointmentReason?: string;
	// biome-ignore lint/suspicious/noExplicitAny: appointment object
	nextAppointment?: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient object
	nextAppointmentPatient?: any;
	todayAppointmentsCount?: number;
	formatClockTime?: (isoString?: string) => string;
	onOpenVisit?: (patientId: string) => void;
	onOpenImaging?: (patientId: string) => void;
	onCallPatientError?: (msg: string) => void;
	onStartNextAppointment?: (patientId: string) => void;
	onOpenSchedule?: () => void;
}
