export type DoctorShiftFinancialMode = "piece_rate" | "chair_rental" | "standard";

export type ShiftOperationalState = "open" | "break" | "emergency" | "closed";

export type ChairOperationalStatus = "free" | "in_treatment" | "disinfection" | "quartz";

export interface DoctorShiftCashBreakdown {
	readonly cashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
}

export interface DoctorShiftStats {
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly inProgressCount: number;
	readonly totalRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly hasActiveOvertime: boolean;
	readonly chairOccupancyPct?: number;
	readonly shiftDurationSeconds?: number;
	readonly shiftStartTimeIso?: string;
	readonly cashBreakdown?: DoctorShiftCashBreakdown | undefined;
}

export interface DoctorShiftControlBarProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly onOpenPayrollModal: () => void;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly shiftStats: DoctorShiftStats;
	readonly doctorName?: string | null | undefined;
	readonly cabinetName?: string | undefined;
	readonly isOffline?: boolean | undefined;
	readonly financialMode?: DoctorShiftFinancialMode | undefined;
	readonly onChangeFinancialMode?: ((mode: DoctorShiftFinancialMode) => void) | undefined;
	readonly chairRentalNetIncomeRub?: number | undefined;
	readonly chairRentalRentExpenseRub?: number | undefined;
	readonly onOpenChairRentalAct?: (() => void) | undefined;
	readonly chairStatus?: ChairOperationalStatus | undefined;
	readonly onChangeChairStatus?: ((status: ChairOperationalStatus) => void) | undefined;
	readonly shiftOperationalState?: ShiftOperationalState | undefined;
	readonly onChangeOperationalState?: ((state: ShiftOperationalState) => void) | undefined;
	readonly onPrintPreliminaryReport?: (() => void) | undefined;
	readonly onCallAssistant?: (() => void) | undefined;
	readonly className?: string | undefined;
}
