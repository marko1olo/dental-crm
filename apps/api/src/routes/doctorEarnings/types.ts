/**
 * types.ts — Контракты и схемы типов сдельной оплаты врача («Тайный блокнот врача»).
 *
 * Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 */

import { z } from "zod";

export const getMyEarningsQuerySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть формата YYYY-MM-DD")
		.optional(),
	shiftId: z.string().optional(),
	doctorId: z.string().optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional(),
	chairRentalRub: z.coerce.number().min(0).optional(),
	advanceRub: z.coerce.number().min(0).optional(),
	taxRegime: z.enum(["employee", "self_employed"]).optional(),
});

export type GetMyEarningsQuery = z.infer<typeof getMyEarningsQuerySchema>;

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

export interface DoctorMyEarningsResponse {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly period: {
		readonly from: string;
		readonly to: string;
		readonly date?: string;
	};
	readonly summary: {
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
	};
	readonly specialtyBreakdown: readonly DoctorEarningsCategoryBreakdown[];
	readonly appointments: readonly DoctorEarningsAppointmentItem[];
	readonly formulaExplanationRu: string;
}

export const CATEGORY_NAMES_RU: Record<string, string> = {
	therapy: "Терапевтическая стоматология",
	orthopedics: "Ортопедическая стоматология (ЗТЛ)",
	surgery: "Хирургия и имплантология",
	orthodontics: "Ортодонтия (брекеты и элайнеры)",
	hygiene: "Профгигиена и пародонтология",
	pediatric: "Детская стоматология",
	retail: "Сопутствующие товары",
	universal: "Общий приём",
};

export const LAB_STATUS_RU: Record<string, string> = {
	draft: "Черновик",
	sent: "Отправлен в ЗТЛ",
	in_progress: "В работе в ЗТЛ",
	shipped: "Доставляется",
	received: "Получен в клинике",
	refitting: "На примерке",
	completed: "Сдан пациенту",
	cancelled: "Отменен",
};
