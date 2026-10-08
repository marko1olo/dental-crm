import {
	dmsSplitCalculationItemSchema,
	insuranceCalculationItemSchema,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";

export const calculateCoverageBodySchema = z.object({
	usedAnnualAmountRub: nonNegativeMoneyRubSchema.default(0),
	items: z.array(insuranceCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта покрытия ДМС."),
});

export type CalculateCoverageBody = z.infer<typeof calculateCoverageBodySchema>;

export const splitInvoiceBodySchema = z.object({
	letterId: z.string().optional(),
	contractId: z.string().optional(),
	patientId: z.string().optional(),
	visitDate: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	items: z.array(dmsSplitCalculationItemSchema).min(1, "Передайте как минимум одну услугу для расчёта разделения счёта."),
});

export type SplitInvoiceBody = z.infer<typeof splitInvoiceBodySchema>;

export const recordUsageBodySchema = z.object({
	amountRub: nonNegativeMoneyRubSchema.refine((v) => v > 0, "Сумма списания должна быть больше 0 ₽."),
	invoiceId: z.string().optional(),
	notes: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	allowOverdraft: z.boolean().optional(),
});

export type RecordUsageBody = z.infer<typeof recordUsageBodySchema>;

/**
 * Тела договоров ДМС
 * Zod safeParse после auth-first → 400 с прежними текстами.
 */
export const insuranceCreateBodySchema = z.object({
	companyName: z.string().optional(),
	policyNumberMask: z.string().optional(),
	coverageTherapyPct: z.number().finite().optional(),
	coverageSurgeryPct: z.number().finite().optional(),
	coverageOrthoPct: z.number().finite().optional(),
	coverageHygienePct: z.number().finite().optional(),
	annualLimitRub: z.number().finite().optional(),
});

export type InsuranceCreateBody = z.infer<typeof insuranceCreateBodySchema>;

export const insuranceUpdateBodySchema = z.object({
	companyName: z.string().optional(),
	policyNumberMask: z.string().optional(),
	coverageTherapyPct: z.number().finite().optional(),
	coverageSurgeryPct: z.number().finite().optional(),
	coverageOrthoPct: z.number().finite().optional(),
	coverageHygienePct: z.number().finite().optional(),
	annualLimitRub: z.number().finite().nullable().optional(),
	isActive: z.boolean().optional(),
});

export type InsuranceUpdateBody = z.infer<typeof insuranceUpdateBodySchema>;

export const guaranteeLetterQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	status: z.string().optional(),
	search: z.string().optional(),
});

export type GuaranteeLetterQuery = z.infer<typeof guaranteeLetterQuerySchema>;

export const registryQuerySchema = z.object({
	insurerKey: z.string().optional(),
	contractId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	period: z.enum(["current_month", "prev_month", "quarter", "custom"]).optional().default("current_month"),
	periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	search: z.string().optional(),
	format: z.enum(["json", "xml", "csv"]).optional().default("json"),
});

export type RegistryQuery = z.infer<typeof registryQuerySchema>;

export const quickAttachBodySchema = z.object({
	patientId: z.string(),
	insurerKey: z.string(),
	policyNumber: z.string(),
	patientFullName: z.string().optional(),
	patientBirthDate: z.string().optional(),
	isEmergency: z.boolean().optional(),
	maxCoverageRub: z.number().optional(),
});

export type QuickAttachBody = z.infer<typeof quickAttachBodySchema>;
