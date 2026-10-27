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
