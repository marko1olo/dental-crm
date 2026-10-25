/**
 * types.ts — Контракты и схемы типов сдельной оплаты врача («Тайный блокнот врача»).
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { z } from "zod";
export { CATEGORY_NAMES_RU, LAB_STATUS_RU } from "./constants.js";
export type {
	DoctorMyEarningsSummary,
	DoctorMyEarningsResponse,
} from "./responseTypes.js";

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
