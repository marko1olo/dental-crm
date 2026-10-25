/**
 * types.ts — Типы данных и утилиты сдельной оплаты труда врача («Тайный блокнот врача»).
 * Mandate 8b: строго <= 120 строк на файл.
 */

export { pluralizeRu } from "./pluralizeRu.js";

export interface DoctorPieceRateWalletViewProps {
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onPrintPayslip?: (() => void) | undefined;
}

export interface DoctorEarningsServiceItem {
	readonly id: string;
	readonly nameRu: string;
	readonly category: string;
	readonly categoryRu: string;
	readonly priceRub: number;
	readonly priceKop: number;
	readonly labCostRub: number;
	readonly labCostKop: number;
	readonly materialCostRub: number;
	readonly materialCostKop: number;
	readonly commissionPercent: number;
	readonly earnedRub: number;
	readonly earnedKop: number;
	readonly isPaid: boolean;
}

export interface DoctorEarningsLabOrderItem {
	readonly id: string;
	readonly toothFdi: string | null;
	readonly material: string | null;
	readonly status: string;
	readonly statusRu: string;
	readonly costRub: number;
	readonly costKop: number;
	readonly dueDate: string | null;
}

export interface DoctorEarningsAppointmentItem {
	readonly appointmentId: string;
	readonly visitId: string | null;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly cardNumber: string;
	readonly startsAtIso: string;
	readonly endsAtIso: string;
	readonly status: string;
	readonly paymentStatus: "paid" | "partial" | "unpaid";
	readonly grossRevenueRub: number;
	readonly grossRevenueKop: number;
	readonly labCostRub: number;
	readonly labCostKop: number;
	readonly materialsCostRub: number;
	readonly materialsCostKop: number;
	readonly netBaseRub: number;
	readonly netBaseKop: number;
	readonly doctorEarnedRub: number;
	readonly doctorEarnedKop: number;
	readonly services: readonly DoctorEarningsServiceItem[];
	readonly labOrders: readonly DoctorEarningsLabOrderItem[];
}

export interface DoctorEarningsCategoryBreakdown {
	readonly category: string;
	readonly categoryRu: string;
	readonly commissionPercent: number;
	readonly grossRevenueRub: number;
	readonly labDeductionsRub: number;
	readonly netBaseRub: number;
	readonly doctorEarnedRub: number;
	readonly servicesCount: number;
}

export interface EarningsDataState {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly period: {
		readonly from: string;
		readonly to: string;
		readonly date?: string;
	};
	readonly summary: {
		readonly totalGrossRevenueRub: number;
		readonly totalGrossRevenueKop: number;
		readonly totalLabDeductionsRub: number;
		readonly totalLabDeductionsKop: number;
		readonly totalMaterialDeductionsRub: number;
		readonly totalMaterialDeductionsKop: number;
		readonly netBaseRevenueRub: number;
		readonly netBaseRevenueKop: number;
		readonly totalDoctorEarnedRub: number;
		readonly totalDoctorEarnedKop: number;
		readonly averageCommissionPercent: number;
		readonly completedAppointmentsCount: number;
		readonly inChairAppointmentsCount: number;
		readonly totalAppointmentsCount: number;
		readonly totalServicesCount: number;
		readonly paidAmountRub: number;
		readonly unpaidAmountRub: number;
		readonly paymentReconciliationStatus:
			| "fully_reconciled"
			| "discrepancy_found"
			| "pending_cashier";
	};
	readonly specialtyBreakdown: readonly DoctorEarningsCategoryBreakdown[];
	readonly appointments: readonly DoctorEarningsAppointmentItem[];
	readonly formulaExplanationRu: string;
}
