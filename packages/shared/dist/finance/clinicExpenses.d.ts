/**
 * Clinic Overhead & Operational Expenses Calculation Engine.
 * Adapted from dentalpin expenses module for DENTE Dental CRM.
 *
 * Provides Fixed vs Variable cost categorization, monthly overhead aggregation,
 * chairside hourly cost calculations, and clinic EBITDA margin analysis.
 */
import { z } from "zod";
export declare const clinicExpenseCategorySchema: z.ZodEnum<["rent", "utilities", "salaries", "supplies", "equipment", "insurance", "maintenance", "lab_fees", "marketing", "taxes", "other"]>;
export type ClinicExpenseCategory = z.infer<typeof clinicExpenseCategorySchema>;
export declare const costNatureSchema: z.ZodEnum<["fixed", "variable", "semi_variable"]>;
export type CostNature = z.infer<typeof costNatureSchema>;
export declare const clinicExpenseItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    clinicId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodEnum<["rent", "utilities", "salaries", "supplies", "equipment", "insurance", "maintenance", "lab_fees", "marketing", "taxes", "other"]>;
    costNature: z.ZodDefault<z.ZodEnum<["fixed", "variable", "semi_variable"]>>;
    amountKopecks: z.ZodNumber;
    expenseDate: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vendorContactId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    receiptUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isRecurring: z.ZodDefault<z.ZodBoolean>;
    recurringIntervalMonths: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    createdBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amountKopecks: number;
    organizationId: string;
    category: "other" | "rent" | "utilities" | "salaries" | "supplies" | "equipment" | "insurance" | "maintenance" | "lab_fees" | "marketing" | "taxes";
    costNature: "fixed" | "variable" | "semi_variable";
    expenseDate: string;
    isRecurring: boolean;
    id?: string | undefined;
    createdAt?: string | undefined;
    clinicId?: string | null | undefined;
    description?: string | null | undefined;
    createdBy?: string | null | undefined;
    vendorContactId?: string | null | undefined;
    receiptUrl?: string | null | undefined;
    recurringIntervalMonths?: number | null | undefined;
}, {
    amountKopecks: number;
    organizationId: string;
    category: "other" | "rent" | "utilities" | "salaries" | "supplies" | "equipment" | "insurance" | "maintenance" | "lab_fees" | "marketing" | "taxes";
    expenseDate: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    clinicId?: string | null | undefined;
    description?: string | null | undefined;
    createdBy?: string | null | undefined;
    costNature?: "fixed" | "variable" | "semi_variable" | undefined;
    vendorContactId?: string | null | undefined;
    receiptUrl?: string | null | undefined;
    isRecurring?: boolean | undefined;
    recurringIntervalMonths?: number | null | undefined;
}>;
export type ClinicExpenseItem = z.infer<typeof clinicExpenseItemSchema>;
/**
 * Standard classification of default cost nature per category.
 */
export declare const CATEGORY_DEFAULT_NATURE: Record<ClinicExpenseCategory, CostNature>;
export interface ClinicOverheadSummary {
    readonly totalExpensesKopecks: number;
    readonly fixedExpensesKopecks: number;
    readonly variableExpensesKopecks: number;
    readonly semiVariableExpensesKopecks: number;
    readonly categoryTotalsKopecks: Record<ClinicExpenseCategory, number>;
    readonly hourlyOperatoryOverheadKopecks: number;
}
/**
 * Calculates clinic overhead metrics for a given period.
 */
export declare function calculateClinicOverhead(expenses: readonly ClinicExpenseItem[], totalWorkingHoursInPeriod?: number, activeOperatoriesCount?: number): ClinicOverheadSummary;
