/**
 * packages/shared/src/analytics/executiveModules/executiveFunnelDefinitions.ts
 * 8-stage primary patient conversion funnel definitions and schemas.
 * Mandate 8b: <= 120 lines.
 */

import { z } from "zod";

export const executiveFunnelStageSchema = z.enum([
	"lead",                  // 1. Первичный лид / Обращение
	"consultation_booking",  // 2. Запись на консультацию
	"attended",              // 3. Явка на первичный приём
	"ai_examination",        // 4. Осмотр + ИИ-диагностика снимков
	"plan_presentation",     // 5. Презентация комплексного плана
	"plan_approved",         // 6. Согласование плана
	"treatment_started",     // 7. Оплата и старт лечения
	"sanitation_completed",  // 8. Санация полости рта
]);

export type ExecutiveFunnelStage = z.infer<typeof executiveFunnelStageSchema>;

export interface ExecutiveFunnelStageDefinition {
	readonly stage: ExecutiveFunnelStage;
	readonly stepNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly benchmarkConversionPercent: number;
	readonly isAiAssisted?: boolean;
}

export const EXECUTIVE_FUNNEL_STAGE_DEFINITIONS: readonly ExecutiveFunnelStageDefinition[] = [
	{
		stage: "lead",
		stepNumber: 1,
		title: "Первичные обращения и лиды",
		shortTitle: "1. Лиды",
		description: "Входящие звонки, заявки с сайта, мессенджеров, карт 2ГИС/Яндекс и рекламы",
		benchmarkConversionPercent: 100,
	},
	{
		stage: "consultation_booking",
		stepNumber: 2,
		title: "Запись на первичную консультацию",
		shortTitle: "2. Запись",
		description: "Администратор забронировал визит в расписании клиники",
		benchmarkConversionPercent: 65,
	},
	{
		stage: "attended",
		stepNumber: 3,
		title: "Явка на первичный приём",
		shortTitle: "3. Явка",
		description: "Пациент фактически пришёл в клинику и сел в кресло",
		benchmarkConversionPercent: 85,
	},
	{
		stage: "ai_examination",
		stepNumber: 4,
		title: "Осмотр + ИИ-диагностика снимков",
		shortTitle: "4. ИИ-осмотр",
		description: "Выполнен фотопротокол, КЛКТ/ОПТГ и автоматический скрининг патологий",
		benchmarkConversionPercent: 90,
		isAiAssisted: true,
	},
	{
		stage: "plan_presentation",
		stepNumber: 5,
		title: "Презентация комплексного плана лечения",
		shortTitle: "5. План",
		description: "Врач и куратор составили и презентовали пациенту финансовую смету",
		benchmarkConversionPercent: 95,
	},
	{
		stage: "plan_approved",
		stepNumber: 6,
		title: "Согласование и утверждение плана",
		shortTitle: "6. Согласован",
		description: "Пациент подписал согласие на предложенный план лечения и график оплат",
		benchmarkConversionPercent: 70,
	},
	{
		stage: "treatment_started",
		stepNumber: 7,
		title: "Оплата и старт лечения",
		shortTitle: "7. Старт",
		description: "Внесена предоплата / первый платёж, начаты терапевтические/хирургические манипуляции",
		benchmarkConversionPercent: 85,
	},
	{
		stage: "sanitation_completed",
		stepNumber: 8,
		title: "Полная санация полости рта",
		shortTitle: "8. Санация",
		description: "Все этапы комплексного плана выполнены, пациент переведён на диспансерный учёт",
		benchmarkConversionPercent: 75,
	},
];
