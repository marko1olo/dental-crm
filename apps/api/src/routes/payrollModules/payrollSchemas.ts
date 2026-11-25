/**
 * payrollSchemas.ts — Строгие Zod-схемы маршрутов расчёта и закрытия зарплаты врачей.
 */

import { z } from "zod";

export const payrollCalculationsQuerySchema = z
	.object({
		doctorId: z.string().optional(),
		from: z.string().optional(),
		to: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		startDateIso: z.string().optional(),
		endDateIso: z.string().optional(),
		percent: z.union([z.string(), z.number()]).optional(),
		commissionPercent: z.union([z.string(), z.number()]).optional(),
		payoutModel: z.enum(["percentage", "chair_rental"]).optional(),
		shiftRateKop: z.union([z.string(), z.number()]).optional(),
		chairRentalRub: z.union([z.string(), z.number()]).optional(),
		chairRentalKop: z.union([z.string(), z.number()]).optional(),
		advanceRub: z.union([z.string(), z.number()]).optional(),
		taxRegime: z.enum(["employee", "self_employed"]).optional(),
	})
	.strict();

export type PayrollCalculationsQuery = z.infer<typeof payrollCalculationsQuerySchema>;

export const closeSettlementSchema = z
	.object({
		idempotencyKey: z.string().optional(),
		doctorId: z.string().min(1),
		periodStart: z.string().min(1),
		periodEnd: z.string().min(1),
		grossRevenueKopecks: z.number().int().optional(),
		grossRevenueKop: z.number().int().optional(),
		grossRevenueRub: z.number().optional(),
		labCostKopecks: z.number().int().optional(),
		labCostKop: z.number().int().optional(),
		labCostRub: z.number().optional(),
		materialsCostKopecks: z.number().int().optional(),
		materialsCostKop: z.number().int().optional(),
		materialCostKop: z.number().int().optional(),
		materialsCostRub: z.number().optional(),
		netBaseRevenueKopecks: z.number().int().optional(),
		netBaseKopecks: z.number().int().optional(),
		netBaseKop: z.number().int().optional(),
		netBaseRevenueRub: z.number().optional(),
		amountKopecks: z.number().int().optional(),
		netPayoutKopecks: z.number().int().optional(),
		netPayoutKop: z.number().int().optional(),
		netPayoutRub: z.number().optional(),
		totalAccruedKopecks: z.number().int().optional(),
		totalAccruedKop: z.number().int().optional(),
		totalAccruedRub: z.number().optional(),
		calculatedPieceworkKopecks: z.number().int().optional(),
		calculatedPieceworkRub: z.number().optional(),
		fixedSalaryKopecks: z.number().int().optional(),
		fixedSalaryRub: z.number().optional(),
		serviceSalaryPriceKopecks: z.number().int().optional(),
		bonusesTotalKopecks: z.number().int().optional(),
		penaltiesTotalKopecks: z.number().int().optional(),
		payoutModel: z.enum(["percentage", "chair_rental"]).optional().default("percentage"),
		categoryPercent: z.number().optional(),
		chairRentalKopecks: z.number().int().optional(),
		chairRentalRub: z.number().optional(),
		rkoNumber: z.string().optional(),
		ndfl13Kopecks: z.number().int().optional(),
		ndflKopecks: z.number().int().optional(),
		ndflKop: z.number().int().optional(),
		ndfl13Rub: z.number().optional(),
		markPaid: z.boolean().optional().default(true),
		doctorReconciled: z.boolean().optional(),
		doctor_reconciled: z.boolean().optional(),
	})
	.strict();

export const reopenSettlementSchema = z
	.object({
		doctorId: z.string().min(1),
		periodStart: z.string().min(1),
		periodEnd: z.string().min(1),
	})
	.strict();
