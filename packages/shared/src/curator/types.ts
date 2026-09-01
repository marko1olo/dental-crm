/**
 * packages/shared/src/curator/types.ts
 *
 * Типы и схемы Zod для выделенной роли «Куратор пациентов» (Фича #27) DENTE CRM.
 * Полное соответствие требованиям:
 *  - Закрепление куратора за пациентом и планом лечения.
 *  - 5-этапная воронка куратора:
 *      1. Первичная консультация (consultation)
 *      2. Согласование плана (plan_negotiation)
 *      3. Предоплата (prepayment)
 *      4. Старт лечения (treatment_start)
 *      5. Завершение (completed)
 *  - Точный расчет конверсии и сдельной комиссии (в копейках и рублях).
 *  - Очередь пациентов с приоритетами и фильтрацией.
 */

import { z } from "zod";

/**
 * 5 канонических этапов воронки куратора лечения
 */
export const curatorFunnelStageSchema = z.enum([
	"consultation",
	"plan_negotiation",
	"prepayment",
	"treatment_start",
	"completed",
]);
export type CuratorFunnelStage = z.infer<typeof curatorFunnelStageSchema>;

export interface CuratorStageDefinition {
	readonly stage: CuratorFunnelStage;
	readonly stepNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly standardCycleDays: number;
	readonly colorTheme: "amber" | "blue" | "purple" | "teal" | "emerald";
	readonly nextStage: CuratorFunnelStage | null;
	readonly targetActionLabel: string;
}

export const CURATOR_STAGE_DEFINITIONS: readonly CuratorStageDefinition[] = [
	{
		stage: "consultation",
		stepNumber: 1,
		title: "Первичная консультация",
		shortTitle: "Консультация",
		description: "Первичный осмотр врача, диагностика (ОПТГ/КЛКТ), фиксация зубной формулы.",
		standardCycleDays: 2,
		colorTheme: "amber",
		nextStage: "plan_negotiation",
		targetActionLabel: "Сформировать смету и начать согласование",
	},
	{
		stage: "plan_negotiation",
		stepNumber: 2,
		title: "Согласование плана лечения",
		shortTitle: "Согласование",
		description: "Презентация 3-уровневой сметы (Эконом/Оптимум/Премиум), расчет рассрочки и скидок.",
		standardCycleDays: 5,
		colorTheme: "blue",
		nextStage: "prepayment",
		targetActionLabel: "Подписать план и выставить счет",
	},
	{
		stage: "prepayment",
		stepNumber: 3,
		title: "Предоплата / Аванс",
		shortTitle: "Предоплата",
		description: "Внесение аванса/предоплаты, подтверждение брони операционного времени.",
		standardCycleDays: 3,
		colorTheme: "purple",
		nextStage: "treatment_start",
		targetActionLabel: "Зафиксировать оплату и начать лечение",
	},
	{
		stage: "treatment_start",
		stepNumber: 4,
		title: "Старт лечения (в процессе)",
		shortTitle: "Лечение",
		description: "Выполнение этапов плана (терапия, хирургия, ортопедия, ортодонтия).",
		standardCycleDays: 30,
		colorTheme: "teal",
		nextStage: "completed",
		targetActionLabel: "Подписать акт выполненных работ",
	},
	{
		stage: "completed",
		stepNumber: 5,
		title: "Завершение лечения",
		shortTitle: "Завершено",
		description: "Все этапы выполнены, акт 804н подписан, окончательный расчет произведен.",
		standardCycleDays: 0,
		colorTheme: "emerald",
		nextStage: null,
		targetActionLabel: "Назначить диспансерный осмотр через 6 мес.",
	},
] as const;

/**
 * Флаги внимания в очереди куратора
 */
export const curatorAttentionFlagSchema = z.enum([
	"stagnant_plan", // Застрял на этапе дольше нормы
	"high_value_plan", // Высокий чек (> 150 000 руб.)
	"requires_followup_call", // Требуется контрольный звонок
	"pending_prepayment", // План согласован, но нет оплаты > 3 дней
	"ready_for_first_visit", // Предоплата есть, нет записи на прием
	"vip_patient", // VIP-пациент / статус лояльности Gold/Platinum
]);
export type CuratorAttentionFlag = z.infer<typeof curatorAttentionFlagSchema>;

/**
 * Элемент очереди пациентов куратора
 */
export const curatorPatientQueueItemSchema = z.object({
	patientId: z.string().uuid(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().nullable().optional(),
	patientEmail: z.string().email().nullable().optional(),
	treatmentPlanId: z.string().uuid(),
	treatmentPlanTitle: z.string().min(1),
	planTier: z.enum(["basic", "optimum", "premium"]).default("optimum"),
	planTotalPriceRub: z.number().nonnegative(),
	planTotalPriceKopecks: z.number().int().nonnegative(),
	paidAmountRub: z.number().nonnegative().default(0),
	paidAmountKopecks: z.number().int().nonnegative().default(0),
	remainingAmountRub: z.number().nonnegative().default(0),
	remainingAmountKopecks: z.number().int().nonnegative().default(0),
	funnelStage: curatorFunnelStageSchema,
	curatorId: z.string().uuid(),
	curatorFullName: z.string().min(1),
	assignedAt: z.string(),
	stageUpdatedAt: z.string(),
	daysInStage: z.number().int().nonnegative(),
	doctorId: z.string().uuid().nullable().optional(),
	doctorFullName: z.string().nullable().optional(),
	priorityScore: z.number().int().min(1).max(100),
	attentionFlags: z.array(curatorAttentionFlagSchema).default([]),
	notes: z.string().nullable().optional(),
	nextContactDate: z.string().nullable().optional(),
});
export type CuratorPatientQueueItem = z.infer<typeof curatorPatientQueueItemSchema>;

/**
 * Сетка расчета сдельной комиссии куратора
 */
export interface CuratorCommissionRule {
	readonly minConversionPercent: number;
	readonly maxConversionPercent: number;
	readonly commissionRatePercent: number;
	readonly tierLabel: string;
}

export const DEFAULT_CURATOR_COMMISSION_RULES: readonly CuratorCommissionRule[] = [
	{
		minConversionPercent: 0,
		maxConversionPercent: 39.99,
		commissionRatePercent: 2.0,
		tierLabel: "Базовая ставка (низкая конверсия)",
	},
	{
		minConversionPercent: 40.0,
		maxConversionPercent: 59.99,
		commissionRatePercent: 3.0,
		tierLabel: "Стандартная ставка",
	},
	{
		minConversionPercent: 60.0,
		maxConversionPercent: 74.99,
		commissionRatePercent: 4.0,
		tierLabel: "Повышенная ставка (целевая конверсия)",
	},
	{
		minConversionPercent: 75.0,
		maxConversionPercent: 100.0,
		commissionRatePercent: 5.5,
		tierLabel: "Премиальная ставка (лидер конверсии)",
	},
] as const;

/**
 * Метрики конверсии и эффективности куратора
 */
export interface CuratorStageStats {
	readonly stage: CuratorFunnelStage;
	readonly title: string;
	readonly count: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly conversionFromPreviousPercent: number;
	readonly conversionFromTopPercent: number;
	readonly dropOffCount: number;
	readonly avgDaysInStage: number;
}

export interface CuratorConversionMetrics {
	readonly curatorId: string;
	readonly curatorFullName: string;
	readonly totalAssignedPatients: number;
	readonly totalPlansCount: number;
	readonly totalPlansSumRub: number;
	readonly totalPlansSumKopecks: number;
	readonly totalCollectedRevenueRub: number;
	readonly totalCollectedRevenueKopecks: number;
	readonly overallConversionPercent: number;
	readonly effectiveCommissionRatePercent: number;
	readonly commissionEarnedRub: number;
	readonly commissionEarnedKopecks: number;
	readonly commissionTierLabel: string;
	readonly activePipelinePatientsCount: number;
	readonly completedPlansCount: number;
	readonly rejectedPlansCount: number;
	readonly stagesBreakdown: readonly CuratorStageStats[];
}

/**
 * Опции фильтрации и поиска по очереди куратора
 */
export interface CuratorQueueFilterOptions {
	readonly curatorId?: string | "all";
	readonly stage?: CuratorFunnelStage | "all";
	readonly priceRange?: "all" | "low" | "medium" | "high"; // low <50k, medium 50-150k, high >150k
	readonly searchQuery?: string;
	readonly onlyWithAttentionFlags?: boolean;
	readonly sortBy?: "priority" | "sum_desc" | "days_in_stage_desc" | "assigned_at_desc";
}

/**
 * Запрос на закрепление / смену куратора
 */
export const curatorPlanAssignmentPayloadSchema = z.object({
	patientId: z.string().uuid(),
	treatmentPlanId: z.string().uuid(),
	curatorId: z.string().uuid(),
	curatorFullName: z.string().min(1),
	initialStage: curatorFunnelStageSchema.default("consultation"),
	customCommissionPercent: z.number().min(0).max(100).nullable().optional(),
	notes: z.string().max(1000).nullable().optional(),
	nextContactDate: z.string().nullable().optional(),
});
export type CuratorPlanAssignmentPayload = z.infer<typeof curatorPlanAssignmentPayloadSchema>;
