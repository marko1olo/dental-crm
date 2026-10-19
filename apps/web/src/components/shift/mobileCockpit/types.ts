export interface MobileShiftConsumableItem {
	readonly id: string;
	readonly name: string;
	readonly category: string;
	readonly unitName: string;
	readonly deductedCount: number;
	readonly stockRemaining: number;
}

export interface MobileShiftAppointmentSummary {
	readonly id: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly timeStart: string;
	readonly timeEnd: string;
	readonly serviceTitle: string;
	readonly statusKey: "in_chair" | "waiting" | "payment" | "completed";
	readonly statusLabel: string;
	readonly priceRub: number;
}

export interface MobileShiftCockpitProps {
	readonly isShiftOpen: boolean;
	readonly onToggleShift: () => void;
	readonly shiftNumber?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly shiftOpenedAtIso?: string | undefined;
	readonly totalAppointmentsCount?: number | undefined;
	readonly completedCount?: number | undefined;
	readonly inChairCount?: number | undefined;
	readonly totalRevenueRub?: number | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly doctorCommissionPct?: number | undefined;
	readonly estimatedDoctorPayoutRub?: number | undefined;
	readonly appointments?: readonly MobileShiftAppointmentSummary[] | undefined;
	readonly onSelectAppointment?: ((appointmentId: string) => void) | undefined;
	readonly onOpenPatientEmk?: ((patientId: string) => void) | undefined;
	readonly onOpenCashCheckout?: ((patientId: string) => void) | undefined;
	readonly nextDoctorName?: string | undefined;
	readonly chairRentalTimerDisplay?: string | undefined;
	readonly isChairRentalActive?: boolean | undefined;
	readonly userRole?: string | undefined;
}
