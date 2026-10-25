/**
 * responseTypes.ts — Итоговые контракты ответа сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type {
	DoctorEarningsAppointmentItem,
	DoctorEarningsCategoryBreakdown,
} from "./types.js";

export interface DoctorMyEarningsSummary {
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalRub?: number | undefined;
	readonly chairRentalKop?: number | undefined;
	readonly advanceRub?: number | undefined;
	readonly advanceKop?: number | undefined;
	readonly mainPayoutRub?: number | undefined;
	readonly mainPayoutKop?: number | undefined;
	readonly npdTaxRub?: number | undefined;
	readonly npdTaxKop?: number | undefined;
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
}

export interface DoctorMyEarningsResponse {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly period: {
		readonly from: string;
		readonly to: string;
		readonly date?: string;
	};
	readonly summary: DoctorMyEarningsSummary;
	readonly specialtyBreakdown: readonly DoctorEarningsCategoryBreakdown[];
	readonly appointments: readonly DoctorEarningsAppointmentItem[];
	readonly formulaExplanationRu: string;
}
