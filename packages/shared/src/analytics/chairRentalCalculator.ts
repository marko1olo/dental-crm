/**
 * packages/shared/src/analytics/chairRentalCalculator.ts
 *
 * Sovereign Chair Rental & Shift Economics Calculator (Mandate 8e, 8n).
 * Provides precise kopeck-level arithmetic for freelance doctors and chair sub-tenants.
 *
 * Models supported:
 * 1. Hourly rental (e.g. 1 500 RUB / hour * 5.5 hours)
 * 2. Per-shift rental (e.g. 5 000 RUB / shift * 1 shift)
 * 3. Revenue-split rental (e.g. 20% to clinic landlord, 80% to doctor)
 * 4. Fixed monthly rate prorated per shift
 */

import { z } from "zod";
import { kopecksToRub } from "../fiscal/kopecksArithmetic.js";

export const chairRentalModelSchema = z.enum(["hourly", "per_shift", "revenue_percent", "fixed_monthly"]);
export type ChairRentalModel = z.infer<typeof chairRentalModelSchema>;

export const chairRentalCalculateSchema = z.object({
	model: chairRentalModelSchema,
	hourlyRateKopecks: z.number().int().nonnegative().optional(),
	hoursWorked: z.number().nonnegative().optional(),
	shiftRateKopecks: z.number().int().nonnegative().optional(),
	shiftsCount: z.number().nonnegative().optional(),
	landlordPercent: z.number().min(0).max(100).optional(),
	monthlyRateKopecks: z.number().int().nonnegative().optional(),
	workingDaysInMonth: z.number().positive().optional(),
	grossRevenueKopecks: z.number().int().nonnegative(),
	labExpensesKopecks: z.number().int().nonnegative().optional(),
	consumablesKopecks: z.number().int().nonnegative().optional(),
	sterilizationExpensesKopecks: z.number().int().nonnegative().optional(),
});
export type ChairRentalCalculateInput = z.infer<typeof chairRentalCalculateSchema>;

export const chairRentalSummaryQuerySchema = z.object({
	doctorId: z.string().uuid().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	model: chairRentalModelSchema.optional().default("hourly"),
	hourlyRateKopecks: z.coerce.number().int().nonnegative().optional().default(150_000), // 1 500 RUB/час
	shiftRateKopecks: z.coerce.number().int().nonnegative().optional().default(400_000),  // 4 000 RUB/смена
	landlordPercent: z.coerce.number().min(0).max(100).optional().default(25),           // 25% клинике
	monthlyRateKopecks: z.coerce.number().int().nonnegative().optional().default(6_600_000), // 66 000 RUB/мес
	workingDaysInMonth: z.coerce.number().positive().optional().default(22),
});
export type ChairRentalSummaryQuery = z.infer<typeof chairRentalSummaryQuerySchema>;

export interface ChairRentalReconciliationAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly periodLabel: string;
	readonly landlordClinicName: string;
	readonly subtenantDoctorName: string;
	readonly modelNameRu: string;
	readonly completedVisitsCount: number;
	readonly grossRevenueRub: number;
	readonly chairRentRub: number;
	readonly labExpensesRub: number;
	readonly consumablesRub: number;
	readonly sterilizationExpensesRub: number;
	readonly netDoctorIncomeRub: number;
	readonly isSanitizedWithoutPii: true;
}

export interface ChairRentalParams {
	readonly model: ChairRentalModel;
	/** Hourly rate in kopecks (when model === 'hourly') */
	readonly hourlyRateKopecks?: number | undefined;
	/** Number of clinical hours spent in chair (e.g. 5.5) */
	readonly hoursWorked?: number | undefined;
	/** Fixed shift rate in kopecks (when model === 'per_shift') */
	readonly shiftRateKopecks?: number | undefined;
	/** Number of shifts worked (default 1) */
	readonly shiftsCount?: number | undefined;
	/** Percent of gross revenue allocated to clinic (0..100) when model === 'revenue_percent' */
	readonly landlordPercent?: number | undefined;
	/** Fixed monthly rent in kopecks (when model === 'fixed_monthly') */
	readonly monthlyRateKopecks?: number | undefined;
	/** Working days in current month (default 22) */
	readonly workingDaysInMonth?: number | undefined;
	/** Total gross clinical revenue from patient treatments in kopecks */
	readonly grossRevenueKopecks: number;
	/** Total dental lab expenses (ЗТЛ) for this doctor's patients in kopecks */
	readonly labExpensesKopecks?: number | undefined;
	/** Total consumables / materials expenses in kopecks */
	readonly consumablesKopecks?: number | undefined;
	/** Sterilization and kraft packages expenses in kopecks (SanPiN 3.3686-21) */
	readonly sterilizationExpensesKopecks?: number | undefined;
}

export interface ChairRentalResult {
	readonly model: ChairRentalModel;
	readonly rentExpenseKopecks: number;
	readonly rentExpenseRub: number;
	readonly grossRevenueKopecks: number;
	readonly grossRevenueRub: number;
	readonly labExpensesKopecks: number;
	readonly labExpensesRub: number;
	readonly consumablesKopecks: number;
	readonly consumablesRub: number;
	readonly sterilizationExpensesKopecks: number;
	readonly sterilizationExpensesRub: number;
	readonly totalExpensesKopecks: number;
	readonly totalExpensesRub: number;
	readonly netProfitKopecks: number;
	readonly netProfitRub: number;
	readonly profitMarginPercent: number;
	readonly effectiveHourlyIncomeRub: number;
}

/**
 * Calculates net profit and expense breakdown for chair rental shift.
 * Uses integer kopecks to guarantee 0 floating-point rounding errors.
 */
export function calculateChairRentalEconomics(params: ChairRentalParams): ChairRentalResult {
	const grossKopecks = Math.max(0, Math.round(params.grossRevenueKopecks || 0));
	const labKopecks = Math.max(0, Math.round(params.labExpensesKopecks || 0));
	const consumablesKopecks = Math.max(0, Math.round(params.consumablesKopecks || 0));
	const sterilizationKopecks = Math.max(0, Math.round(params.sterilizationExpensesKopecks || 0));

	let rentExpenseKopecks = 0;

	switch (params.model) {
		case "hourly": {
			const rate = Math.max(0, Math.round(params.hourlyRateKopecks || 0));
			const hours = Math.max(0, params.hoursWorked || 0);
			rentExpenseKopecks = Math.round(rate * hours);
			break;
		}
		case "per_shift": {
			const rate = Math.max(0, Math.round(params.shiftRateKopecks || 0));
			const shifts = Math.max(0, params.shiftsCount ?? 1);
			rentExpenseKopecks = Math.round(rate * shifts);
			break;
		}
		case "revenue_percent": {
			const percent = Math.min(100, Math.max(0, params.landlordPercent || 0));
			rentExpenseKopecks = Math.round((grossKopecks * percent) / 100);
			break;
		}
		case "fixed_monthly": {
			const monthly = Math.max(0, Math.round(params.monthlyRateKopecks || 0));
			const workingDays = Math.max(1, params.workingDaysInMonth || 22);
			const shifts = Math.max(0, params.shiftsCount ?? 1);
			rentExpenseKopecks = Math.round((monthly / workingDays) * shifts);
			break;
		}
		default:
			rentExpenseKopecks = 0;
	}

	const totalExpensesKopecks = rentExpenseKopecks + labKopecks + consumablesKopecks + sterilizationKopecks;
	const netProfitKopecks = grossKopecks - totalExpensesKopecks;

	const hours = params.hoursWorked && params.hoursWorked > 0 ? params.hoursWorked : 1;
	const profitMarginPercent = grossKopecks > 0
		? Number(((netProfitKopecks / grossKopecks) * 100).toFixed(1))
		: 0;

	const effectiveHourlyIncomeRub = Number(((netProfitKopecks / 100) / hours).toFixed(2));

	return {
		model: params.model,
		rentExpenseKopecks,
		rentExpenseRub: kopecksToRub(rentExpenseKopecks),
		grossRevenueKopecks: grossKopecks,
		grossRevenueRub: kopecksToRub(grossKopecks),
		labExpensesKopecks: labKopecks,
		labExpensesRub: kopecksToRub(labKopecks),
		consumablesKopecks,
		consumablesRub: kopecksToRub(consumablesKopecks),
		sterilizationExpensesKopecks: sterilizationKopecks,
		sterilizationExpensesRub: kopecksToRub(sterilizationKopecks),
		totalExpensesKopecks,
		totalExpensesRub: kopecksToRub(totalExpensesKopecks),
		netProfitKopecks,
		netProfitRub: kopecksToRub(netProfitKopecks),
		profitMarginPercent,
		effectiveHourlyIncomeRub,
	};
}
