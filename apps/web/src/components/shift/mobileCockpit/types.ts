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
	readonly shiftNumber?: number;
	readonly doctorName?: string;
	readonly doctorSpecialty?: string;
	readonly cabinetName?: string;
	readonly shiftOpenedAtIso?: string;
	readonly totalAppointmentsCount?: number;
	readonly completedCount?: number;
	readonly inChairCount?: number;
	readonly totalRevenueRub?: number;
	readonly cashInDrawerRub?: number;
	readonly cardSumRub?: number;
	readonly sbpSumRub?: number;
	readonly doctorCommissionPct?: number;
	readonly estimatedDoctorPayoutRub?: number;
	readonly appointments?: readonly MobileShiftAppointmentSummary[];
	readonly onSelectAppointment?: (appointmentId: string) => void;
	readonly onOpenPatientEmk?: (patientId: string) => void;
	readonly onOpenCashCheckout?: (patientId: string) => void;
	readonly nextDoctorName?: string;
}
