/**
 * Clinic Overhead & Operational Expenses Calculation Engine.
 * Adapted from dentalpin expenses module for DENTE Dental CRM.
 *
 * Provides Fixed vs Variable cost categorization, monthly overhead aggregation,
 * chairside hourly cost calculations, and clinic EBITDA margin analysis.
 */

import { z } from "zod";

export const clinicExpenseCategorySchema = z.enum([
	"rent",
	"utilities",
	"salaries",
	"supplies",
	"equipment",
	"insurance",
	"maintenance",
	"lab_fees",
	"marketing",
	"taxes",
	"other",
]);
export type ClinicExpenseCategory = z.infer<typeof clinicExpenseCategorySchema>;

export const costNatureSchema = z.enum(["fixed", "variable", "semi_variable"]);
export type CostNature = z.infer<typeof costNatureSchema>;

export const clinicExpenseItemSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	category: clinicExpenseCategorySchema,
	costNature: costNatureSchema.default("fixed"),
	amountKopecks: z.number().int().positive().refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)),
	expenseDate: z.string(), // YYYY-MM-DD
	description: z.string().max(2000).optional().nullable(),
	vendorContactId: z.string().uuid().optional().nullable(),
	receiptUrl: z.string().url().optional().nullable(),
	isRecurring: z.boolean().default(false),
	recurringIntervalMonths: z.number().int().min(1).max(12).refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)).optional().nullable(),
	createdBy: z.string().uuid().optional().nullable(),
	createdAt: z.string().datetime().optional(),
});
export type ClinicExpenseItem = z.infer<typeof clinicExpenseItemSchema>;

/**
 * Standard classification of default cost nature per category.
 */
export const CATEGORY_DEFAULT_NATURE: Record<ClinicExpenseCategory, CostNature> = {
	rent: "fixed",
	utilities: "semi_variable",
	salaries: "fixed",
	supplies: "variable",
	equipment: "fixed",
	insurance: "fixed",
	maintenance: "semi_variable",
	lab_fees: "variable",
	marketing: "semi_variable",
	taxes: "variable",
	other: "semi_variable",
};

export interface ClinicOverheadSummary {
	readonly totalExpensesKopecks: number;
	readonly fixedExpensesKopecks: number;
	readonly variableExpensesKopecks: number;
	readonly semiVariableExpensesKopecks: number;
	readonly categoryTotalsKopecks: Record<ClinicExpenseCategory, number>;
	readonly hourlyOperatoryOverheadKopecks: number; // Cost per chair per operating hour
}

/**
 * Calculates clinic overhead metrics for a given period.
 */
export function calculateClinicOverhead(
	expenses: readonly ClinicExpenseItem[],
	totalWorkingHoursInPeriod = 160,
	activeOperatoriesCount = 3,
): ClinicOverheadSummary {
	let total = 0;
	let fixed = 0;
	let variable = 0;
	let semiVariable = 0;

	const categoryTotals: Record<ClinicExpenseCategory, number> = {
		rent: 0,
		utilities: 0,
		salaries: 0,
		supplies: 0,
		equipment: 0,
		insurance: 0,
		maintenance: 0,
		lab_fees: 0,
		marketing: 0,
		taxes: 0,
		other: 0,
	};

	for (const exp of expenses) {
		const amount = exp.amountKopecks;
		total += amount;
		categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amount;

		const nature = exp.costNature || CATEGORY_DEFAULT_NATURE[exp.category] || "fixed";
		if (nature === "fixed") fixed += amount;
		else if (nature === "variable") variable += amount;
		else semiVariable += amount;
	}

	const totalCapacityHours = Math.max(1, totalWorkingHoursInPeriod * Math.max(1, activeOperatoriesCount));
	const hourlyOperatoryOverheadKopecks = Math.round(total / totalCapacityHours);

	return {
		totalExpensesKopecks: total,
		fixedExpensesKopecks: fixed,
		variableExpensesKopecks: variable,
		semiVariableExpensesKopecks: semiVariable,
		categoryTotalsKopecks: categoryTotals,
		hourlyOperatoryOverheadKopecks,
	};
}
