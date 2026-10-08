/**
 * Zod validation schemas and error messages for Insurance / DMS routes.
 * Layer 0: Pure schemas and contracts (0 side effects).
 */
import {
	dmsSplitCalculationItemSchema,
	insuranceCalculationItemSchema,
	nonNegativeMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";

export const calculateCoverageBodySchema = z.object({
	usedAnnualAmountRub: nonNegativeMoneyRubSchema.default(0),
	items: z
		.array(insuranceCalculationItemSchema)
		.min(1, "Передайте как минимум одну услугу для расчёта покрытия ДМС."),
});

export const splitInvoiceBodySchema = z.object({
	letterId: z.string().optional(),
	contractId: z.string().optional(),
	patientId: z.string().optional(),
	visitDate: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	items: z
		.array(dmsSplitCalculationItemSchema)
		.min(1, "Передайте как минимум одну услугу для расчёта разделения счёта."),
});

export const recordUsageBodySchema = z.object({
	amountRub: nonNegativeMoneyRubSchema.refine(
		(v) => v > 0,
		"Сумма списания должна быть больше 0 ₽.",
	),
	invoiceId: z.string().optional(),
	notes: z.string().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	allowOverdraft: z.boolean().optional(),
});

/**
 * Тела договоров ДМС раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body (POST/PUT без JSON) TypeError → 500.
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

export const guaranteeLettersQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	status: z.string().optional(),
	search: z.string().optional(),
});

export const registryQuerySchema = z.object({
	insurerKey: z.string().optional(),
	contractId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
	period: z
		.enum(["current_month", "prev_month", "quarter", "custom"])
		.optional()
		.default("current_month"),
	periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	search: z.string().optional(),
	format: z.enum(["json", "xml", "csv"]).optional().default("json"),
});

/**
 * Название страховой компании — единственное обязательное поле договора ДМС.
 *
 * Поле названо ровно так, как подписано в форме («Страховая компания»,
 * InsuranceContractsPanel.tsx:496), а не именем колонки базы: администратор ищет
 * на экране подпись, а `companyName` ему ни о чём не говорит.
 *
 * Один текст на создание и на изменение: раньше проверка стояла только при
 * создании, и это была не косметика, а утрата данных (см. PUT ниже).
 */
export const INSURANCE_COMPANY_NAME_REQUIRED =
	"Не заполнено поле «Страховая компания» — по договору ДМС это единственное обязательное поле, и один пробел в нём не считается названием. Впишите название страховой компании и сохраните снова: остальные заполненные поля остались на экране.";

/** Договора нет: причина и оба действия, доступных администратору. */
export const INSURANCE_CONTRACT_NOT_FOUND =
	"Этот договор ДМС в вашей клинике не найден: возможно, его уже убрали из работы с другого рабочего места. Обновите список договоров — если договор нужен, добавьте его заново.";
