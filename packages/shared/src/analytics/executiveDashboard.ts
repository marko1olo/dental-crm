/**
 * packages/shared/src/analytics/executiveDashboard.ts
 *
 * Рабочий стол Генерального директора стоматологической клиники (Фича #29).
 *
 * ФУНКЦИОНАЛ:
 * 1. Сквозная 8-этапная воронка первичных пациентов:
 *    - 1. Первичный лид (Lead / Inbound inquiry)
 *    - 2. Запись на консультацию (Consultation booking)
 *    - 3. Явка на первичный приём (Arrival / Attendance)
 *    - 4. Осмотр + ИИ-диагностика Diagnocat (AI examination)
 *    - 5. Презентация комплексного плана (Plan presentation)
 *    - 6. Согласование плана (Plan approved)
 *    - 7. Оплата / Старт лечения (Payment & treatment start)
 *    - 8. Санация полости рта (Sanitation completed)
 *
 * 2. План/факт выручки клиники за день / месяц / квартал / год с разбивкой по 5 отделениям:
 *    - Терапия (therapy)
 *    - Ортопедия (orthopedics)
 *    - Хирургия и Имплантация (surgery_implantation)
 *    - Ортодонтия (orthodontics)
 *    - Детская стоматология (pediatric)
 *
 * 3. Unit-экономика и операционные KPI:
 *    - LTV пациента (Customer Lifetime Value) в целых копейках
 *    - Средний чек (общий, первичные, повторные) в целых копейках
 *    - Стоимость привлечения пациента (CAC)
 *    - Соотношение LTV / CAC (коэффициент отдачи)
 *    - Коэффициент загрузки кресел клиники (Chair Occupancy Rate, %)
 *    - Сквозная конверсия Лид -> Санация (%)
 *    - Учёт отмен и неявок (Cancelled vs No-Show)
 *
 * СТАНДАРТЫ:
 * - 100% Zero Mocks, целочисленные копейки (money math in integer kopecks).
 * - Строгие Zod-схемы и TypeScript-контракты.
 */

import { z } from "zod";
import { formatKopecksRu } from "../utils/money.js";

// ─── 1. ВОРОНКА ПЕРВИЧНЫХ ПАЦИЕНТОВ (8 ЭТАПОВ) ──────────────────────────────

export const executiveFunnelStageSchema = z.enum([
	"lead",                  // 1. Первичный лид / Обращение
	"consultation_booking",  // 2. Запись на консультацию
	"attended",              // 3. Явка на первичный приём
	"ai_examination",        // 4. Осмотр + ИИ-диагностика Diagnocat
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
	readonly benchmarkConversionPercent: number; // Нормативный бенчмарк конверсии
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
		title: "Осмотр + ИИ-диагностика Diagnocat",
		shortTitle: "4. ИИ-осмотр",
		description: "Выполнен фотопротокол, КЛКТ/ОПТГ и автоматический скрининг Diagnocat",
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

export interface ExecutiveFunnelStageItem {
	readonly stage: ExecutiveFunnelStage;
	readonly stepNumber: number;
	readonly title: string;
	readonly shortTitle: string;
	readonly count: number;
	readonly conversionFromPreviousPercent: number; // Конверсия от предыдущего шага (%)
	readonly conversionFromLeadPercent: number;     // Сквозная конверсия от первого шага (%)
	readonly dropOffCount: number;                  // Потери на данном этапе
	readonly dropOffPercent: number;                // Процент отвала (%)
	readonly totalVolumeKopecks: number;            // Объем финансовых обязательств в копейках
	readonly totalVolumeRub: number;                // Объем в рублях
	readonly totalVolumeFormatted: string;          // Отформатированная сумма
	readonly unitCostKopecks: number | null;        // Стоимость одного перехода на этап
	readonly unitCostFormatted: string;
	readonly isAiAssisted?: boolean | undefined;
}

// ─── 2. РАЗБИВКА ПЛАН/ФАКТ ВЫРУЧКИ ПО ОТДЕЛЕНИЯМ ────────────────────────────

export const executiveDepartmentKeySchema = z.enum([
	"therapy",               // Терапия
	"orthopedics",           // Ортопедия
	"surgery_implantation",  // Хирургия и Имплантация
	"orthodontics",          // Ортодонтия
	"pediatric",             // Детская стоматология
]);

export type ExecutiveDepartmentKey = z.infer<typeof executiveDepartmentKeySchema>;

export type DepartmentPerformanceStatus =
	| "ahead"     // Перевыполнение плана (>= 105%)
	| "on_track"  // В графике плана (95% - 104.9%)
	| "behind"    // Незначительное отставание (75% - 94.9%)
	| "critical"; // Критическое отставание (< 75%)

export interface ExecutiveDepartmentDefinition {
	readonly key: ExecutiveDepartmentKey;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly defaultShareTargetPercent: number; // Нормативная доля в выручке клиники
	readonly accentColor: string;
	readonly description: string;
}

export const EXECUTIVE_DEPARTMENT_DEFINITIONS: readonly ExecutiveDepartmentDefinition[] = [
	{
		key: "therapy",
		titleRu: "Терапевтическая стоматология",
		shortTitleRu: "Терапия",
		defaultShareTargetPercent: 30,
		accentColor: "var(--teal, #0d9488)",
		description: "Лечение кариеса, пульпита, периодонтита, эндодонтия под микроскопом, эстетическая реставрация",
	},
	{
		key: "orthopedics",
		titleRu: "Ортопедическая стоматология",
		shortTitleRu: "Ортопедия",
		defaultShareTargetPercent: 28,
		accentColor: "var(--accent, #6366f1)",
		description: "Коронки из диоксида циркония, керамические виниры E.max, мостовидные и бюгельные протезы",
	},
	{
		key: "surgery_implantation",
		titleRu: "Хирургия и Имплантация",
		shortTitleRu: "Хирургия",
		defaultShareTargetPercent: 24,
		accentColor: "var(--err-fg, #ef4444)",
		description: "Дентальная имплантация, All-on-4/All-on-6, костная пластика, синус-лифтинг, сложное удаление зубов",
	},
	{
		key: "orthodontics",
		titleRu: "Ортодонтия",
		shortTitleRu: "Ортодонтия",
		defaultShareTargetPercent: 12,
		accentColor: "var(--warn-fg, #f59e0b)",
		description: "Брекет-системы (Damon, самолигирующие), прозрачные элайнеры, детские пластинки и каппы",
	},
	{
		key: "pediatric",
		titleRu: "Детская стоматология",
		shortTitleRu: "Детство",
		defaultShareTargetPercent: 6,
		accentColor: "var(--brand-300, #38bdf8)",
		description: "Лечение молочных и постоянных зубов у детей, цветные пломбы, циркониевые коронки, адаптационный приём",
	},
];

export interface ExecutiveDepartmentItem {
	readonly departmentKey: ExecutiveDepartmentKey;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly planRevenueKopecks: number;
	readonly factRevenueKopecks: number;
	readonly planRevenueRub: number;
	readonly factRevenueRub: number;
	readonly planRevenueFormatted: string;
	readonly factRevenueFormatted: string;
	readonly planFulfillmentPercent: number;    // Факт / План * 100%
	readonly shareOfTotalRevenuePercent: number;// Доля в фактической выручке (%)
	readonly averageCheckKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckFormatted: string;
	readonly completedVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly status: DepartmentPerformanceStatus;
	readonly statusLabel: string;
	readonly accentColor: string;
}

// ─── 3. UNIT-ЭКОНОМИКА И ОПЕРАЦИОННЫЕ KPI РУКОВОДИТЕЛЯ ──────────────────────

export const executivePeriodSchema = z.enum(["day", "month", "quarter", "year"]);
export type ExecutivePeriod = z.infer<typeof executivePeriodSchema>;

export interface ExecutiveKpis {
	readonly period: ExecutivePeriod;
	readonly periodLabelRu: string;
	
	// Выручка и план
	readonly totalRevenueKopecks: number;
	readonly totalRevenueRub: number;
	readonly totalRevenueFormatted: string;
	readonly totalRevenuePlanKopecks: number;
	readonly totalRevenuePlanRub: number;
	readonly totalRevenuePlanFormatted: string;
	readonly overallPlanFulfillmentPercent: number; // Общее выполнение плана (%)
	
	// Пациенты и чеки
	readonly totalPatientsCount: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
	readonly primaryPatientsPercent: number;
	readonly averageCheckKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckFormatted: string;
	readonly primaryAverageCheckKopecks: number;
	readonly primaryAverageCheckFormatted: string;
	readonly repeatAverageCheckKopecks: number;
	readonly repeatAverageCheckFormatted: string;
	
	// Unit-экономика
	readonly patientLtvKopecks: number;             // Пожизненная ценность пациента
	readonly patientLtvFormatted: string;
	readonly cacKopecks: number;                    // Стоимость привлечения первичного пациента
	readonly cacFormatted: string;
	readonly ltvToCacRatio: number;                 // Коэффициент LTV / CAC (например, 4.5x)
	readonly totalMarketingSpendKopecks: number;
	readonly totalMarketingSpendFormatted: string;
	
	// Операционная эффективность клиники
	readonly chairOccupancyRatePercent: number;     // Загрузка кресел клиники (%)
	readonly totalOccupiedMinutes: number;          // Минуты приёмов
	readonly totalAvailableMinutes: number;         // Доступный фонд кресел
	readonly totalChairsCount: number;
	readonly leadToSanitationConversionPercent: number; // Сквозная конверсия Лид -> Санация
	readonly aiDiagnosticRatePercent: number;       // Доля первичных с ИИ-осмотром Diagnocat (%)
	
	// Потери расписания
	readonly cancelledVisitsCount: number;          // Отменено пациентом заранее
	readonly noShowVisitsCount: number;             // Неявки без предупреждения (No-Show)
	readonly cancellationRatePercent: number;       // Процент отмен и неявок
	
	readonly totalCompletedVisits: number;
	readonly activeDoctorsCount: number;
	readonly totalLeadsCount: number;
	readonly totalSanitationCount: number;
}

// ─── 4. ПОЛНЫЙ ДАШБОРД ГЕНЕРАЛЬНОГО ДИРЕКТОРА (PAYLOAD) ──────────────────────

export interface ExecutiveDashboardPayload {
	readonly kpis: ExecutiveKpis;
	readonly funnelStages: readonly ExecutiveFunnelStageItem[];
	readonly departments: readonly ExecutiveDepartmentItem[];
	readonly period: ExecutivePeriod;
	readonly dateRangeStartIso: string;
	readonly dateRangeEndIso: string;
	readonly updatedAtIso: string;
	readonly isEmpty: boolean;
}

// ─── 5. ЧИСТЫЕ АЛГОРИТМЫ РАСЧЁТА (PURE FUNCTIONS) ───────────────────────────

export interface RawFunnelStageInput {
	readonly stage: ExecutiveFunnelStage;
	readonly count: number;
	readonly totalVolumeKopecks?: number;
	readonly isAiAssisted?: boolean;
}

/**
 * Расчет сквозной 8-этапной воронки первичных пациентов с отвалами и стоимостью шага.
 * Устраняет аномалии деления (DEFECT-FUNNEL-01): значения нормируются, конверсия не превышает 100%.
 */
export function calculateExecutiveFunnel(
	rawStages: readonly RawFunnelStageInput[],
	totalMarketingSpendKopecks = 0,
): ExecutiveFunnelStageItem[] {
	const countMap = new Map<ExecutiveFunnelStage, number>();
	const volumeMap = new Map<ExecutiveFunnelStage, number>();

	for (const input of rawStages) {
		countMap.set(input.stage, Math.max(0, Math.round(input.count)));
		if (input.totalVolumeKopecks !== undefined) {
			volumeMap.set(input.stage, Math.max(0, Math.round(input.totalVolumeKopecks)));
		}
	}

	const leadCount = countMap.get("lead") ?? 0;
	let previousCount = leadCount;

	return EXECUTIVE_FUNNEL_STAGE_DEFINITIONS.map((def, index) => {
		const currentCount = countMap.get(def.stage) ?? 0;
		const volumeKopecks = volumeMap.get(def.stage) ?? 0;

		let conversionFromPrevious = 100.0;
		if (index > 0) {
			// Защита от деления на ноль и аномалий статических срезов:
			// если previousCount <= 0 или currentCount > previousCount, берем отношение к leadCount или 100%
			if (previousCount > 0) {
				conversionFromPrevious = Math.min(100.0, Number(((currentCount / previousCount) * 100).toFixed(1)));
			} else if (leadCount > 0) {
				conversionFromPrevious = Math.min(100.0, Number(((currentCount / leadCount) * 100).toFixed(1)));
			} else {
				conversionFromPrevious = 0.0;
			}
		}

		let conversionFromLead = 100.0;
		if (index > 0) {
			conversionFromLead =
				leadCount > 0
					? Math.min(100.0, Number(((currentCount / leadCount) * 100).toFixed(1)))
					: 0.0;
		}

		const dropOffCount =
			index > 0 ? Math.max(0, previousCount - currentCount) : 0;
		const dropOffPercent =
			index > 0 && previousCount > 0
				? Math.min(100.0, Number(((dropOffCount / previousCount) * 100).toFixed(1)))
				: 0.0;

		let unitCostKopecks: number | null = null;
		if (totalMarketingSpendKopecks > 0 && currentCount > 0) {
			unitCostKopecks = Math.round(totalMarketingSpendKopecks / currentCount);
		}

		// Обновляем счетчик для следующего шага
		previousCount = currentCount;

		return {
			stage: def.stage,
			stepNumber: def.stepNumber,
			title: def.title,
			shortTitle: def.shortTitle,
			count: currentCount,
			conversionFromPreviousPercent: Math.min(100, Math.max(0, conversionFromPrevious)),
			conversionFromLeadPercent: Math.min(100, Math.max(0, conversionFromLead)),
			dropOffCount,
			dropOffPercent: Math.min(100, Math.max(0, dropOffPercent)),
			totalVolumeKopecks: volumeKopecks,
			totalVolumeRub: Math.round(volumeKopecks / 100),
			totalVolumeFormatted: formatKopecksRu(volumeKopecks),
			unitCostKopecks,
			unitCostFormatted: unitCostKopecks !== null ? formatKopecksRu(unitCostKopecks) : "—",
			...(def.isAiAssisted !== undefined ? { isAiAssisted: def.isAiAssisted } : {}),
		};
	});
}

export interface RawDepartmentInput {
	readonly departmentKey: ExecutiveDepartmentKey;
	readonly planRevenueKopecks: number;
	readonly factRevenueKopecks: number;
	readonly completedVisitsCount: number;
	readonly uniquePatientsCount: number;
}

/**
 * Расчет показателей План/Факт по 5 клиническим отделениям.
 */
export function calculateDepartmentBreakdown(
	inputs: readonly RawDepartmentInput[],
): ExecutiveDepartmentItem[] {
	const totalFactKopecks = inputs.reduce(
		(sum, item) => sum + Math.max(0, item.factRevenueKopecks),
		0,
	);

	const inputMap = new Map<ExecutiveDepartmentKey, RawDepartmentInput>();
	for (const item of inputs) {
		inputMap.set(item.departmentKey, item);
	}

	return EXECUTIVE_DEPARTMENT_DEFINITIONS.map((def) => {
		const raw = inputMap.get(def.key) || {
			departmentKey: def.key,
			planRevenueKopecks: 0,
			factRevenueKopecks: 0,
			completedVisitsCount: 0,
			uniquePatientsCount: 0,
		};

		const planKop = Math.max(0, Math.round(raw.planRevenueKopecks));
		const factKop = Math.max(0, Math.round(raw.factRevenueKopecks));
		const visits = Math.max(0, Math.round(raw.completedVisitsCount));
		const patients = Math.max(0, Math.round(raw.uniquePatientsCount));

		const planFulfillmentPercent =
			planKop > 0
				? Number(((factKop / planKop) * 100).toFixed(1))
				: factKop > 0
					? 100.0
					: 0.0;

		const shareOfTotalRevenuePercent =
			totalFactKopecks > 0
				? Number(((factKop / totalFactKopecks) * 100).toFixed(1))
				: 0.0;

		const averageCheckKopecks =
			visits > 0 ? Math.round(factKop / visits) : 0;

		let status: DepartmentPerformanceStatus = "on_track";
		let statusLabel = "В графике плана";

		if (planFulfillmentPercent >= 105.0) {
			status = "ahead";
			statusLabel = "План перевыполнен";
		} else if (planFulfillmentPercent >= 95.0) {
			status = "on_track";
			statusLabel = "В графике плана";
		} else if (planFulfillmentPercent >= 75.0) {
			status = "behind";
			statusLabel = "Незначительное отставание";
		} else {
			status = "critical";
			statusLabel = "Критическое отставание";
		}

		return {
			departmentKey: def.key,
			titleRu: def.titleRu,
			shortTitleRu: def.shortTitleRu,
			planRevenueKopecks: planKop,
			factRevenueKopecks: factKop,
			planRevenueRub: Math.round(planKop / 100),
			factRevenueRub: Math.round(factKop / 100),
			planRevenueFormatted: formatKopecksRu(planKop),
			factRevenueFormatted: formatKopecksRu(factKop),
			planFulfillmentPercent,
			shareOfTotalRevenuePercent,
			averageCheckKopecks,
			averageCheckRub: Math.round(averageCheckKopecks / 100),
			averageCheckFormatted: formatKopecksRu(averageCheckKopecks),
			completedVisitsCount: visits,
			uniquePatientsCount: patients,
			status,
			statusLabel,
			accentColor: def.accentColor,
		};
	});
}

export interface CalculateExecutiveKpisParams {
	readonly period: ExecutivePeriod;
	readonly totalRevenueKopecks: number;
	readonly totalRevenuePlanKopecks: number;
	readonly primaryRevenueKopecks: number;
	readonly repeatRevenueKopecks: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
	readonly totalMarketingSpendKopecks: number;
	readonly historicalCohortLtvKopecks: number;
	readonly totalOccupiedMinutes: number;
	readonly totalAvailableMinutes: number;
	readonly totalChairsCount: number;
	readonly totalLeadsCount: number;
	readonly aiExaminedLeadsCount: number;
	readonly totalSanitationCount: number;
	readonly totalCompletedVisits: number;
	readonly activeDoctorsCount: number;
	readonly cancelledVisitsCount?: number;
	readonly noShowVisitsCount?: number;
}

/**
 * Расчет сводных KPI генерального директора клиники.
 */
export function calculateExecutiveKpisSummary(
	params: CalculateExecutiveKpisParams,
): ExecutiveKpis {
	const revKop = Math.max(0, Math.round(params.totalRevenueKopecks));
	const planKop = Math.max(0, Math.round(params.totalRevenuePlanKopecks));
	const primaryPatients = Math.max(0, Math.round(params.primaryPatientsCount));
	const repeatPatients = Math.max(0, Math.round(params.repeatPatientsCount));
	const totalPatients = primaryPatients + repeatPatients;

	const overallPlanFulfillmentPercent =
		planKop > 0
			? Number(((revKop / planKop) * 100).toFixed(1))
			: revKop > 0
				? 100.0
				: 0.0;

	const primaryPercent =
		totalPatients > 0
			? Number(((primaryPatients / totalPatients) * 100).toFixed(1))
			: 0.0;

	const visits = Math.max(0, Math.round(params.totalCompletedVisits));
	const averageCheckKopecks =
		visits > 0 ? Math.round(revKop / visits) : totalPatients > 0 ? Math.round(revKop / totalPatients) : 0;

	const primaryAvgCheckKopecks =
		primaryPatients > 0
			? Math.round(params.primaryRevenueKopecks / primaryPatients)
			: 0;

	const repeatAvgCheckKopecks =
		repeatPatients > 0
			? Math.round(params.repeatRevenueKopecks / repeatPatients)
			: 0;

	// CAC: затраты на маркетинг / первичных пациентов
	const mktSpend = Math.max(0, Math.round(params.totalMarketingSpendKopecks));
	const cacKopecks =
		primaryPatients > 0 ? Math.round(mktSpend / primaryPatients) : 0;

	// LTV: средняя пожизненная выручка с пациента
	const ltvKopecks = Math.max(0, Math.round(params.historicalCohortLtvKopecks || revKop));

	// LTV / CAC соотношение (коэффициент эффективности маркетинга)
	let ltvToCacRatio = 0.0;
	if (cacKopecks > 0) {
		ltvToCacRatio = Number((ltvKopecks / cacKopecks).toFixed(1));
	} else if (ltvKopecks > 0 && mktSpend === 0) {
		ltvToCacRatio = 99.9; // Органика
	}

	// Коэффициент загрузки кресел
	const occupiedMin = Math.max(0, Math.round(params.totalOccupiedMinutes));
	const availableMin = Math.max(0, Math.round(params.totalAvailableMinutes));
	let chairOccupancyRatePercent = 0.0;
	if (availableMin > 0) {
		chairOccupancyRatePercent = Math.min(
			100.0,
			Number(((occupiedMin / availableMin) * 100).toFixed(1)),
		);
	}

	// Сквозная конверсия Лид -> Санация
	const leads = Math.max(0, Math.round(params.totalLeadsCount));
	const sanCount = Math.max(0, Math.round(params.totalSanitationCount));
	const leadToSanitationConversionPercent =
		leads > 0 ? Number(((sanCount / leads) * 100).toFixed(1)) : 0.0;

	// Доля ИИ-осмотров
	const aiExams = Math.max(0, Math.round(params.aiExaminedLeadsCount));
	const aiDiagnosticRatePercent =
		primaryPatients > 0
			? Math.min(100, Number(((aiExams / primaryPatients) * 100).toFixed(1)))
			: 0.0;

	// Учёт отмен и неявок (DEFECT-FUNNEL-03)
	const cancelledVisits = Math.max(0, Math.round(params.cancelledVisitsCount ?? 0));
	const noShowVisits = Math.max(0, Math.round(params.noShowVisitsCount ?? 0));
	const totalScheduled = visits + cancelledVisits + noShowVisits;
	const cancellationRatePercent =
		totalScheduled > 0
			? Number((((cancelledVisits + noShowVisits) / totalScheduled) * 100).toFixed(1))
			: 0.0;

	const PERIOD_LABELS: Record<ExecutivePeriod, string> = {
		day: "Сегодня (1 день)",
		month: "Текущий месяц",
		quarter: "Текущий квартал",
		year: "Текущий год",
	};

	return {
		period: params.period,
		periodLabelRu: PERIOD_LABELS[params.period] || "Период",
		totalRevenueKopecks: revKop,
		totalRevenueRub: Math.round(revKop / 100),
		totalRevenueFormatted: formatKopecksRu(revKop),
		totalRevenuePlanKopecks: planKop,
		totalRevenuePlanRub: Math.round(planKop / 100),
		totalRevenuePlanFormatted: formatKopecksRu(planKop),
		overallPlanFulfillmentPercent,
		totalPatientsCount: totalPatients,
		primaryPatientsCount: primaryPatients,
		repeatPatientsCount: repeatPatients,
		primaryPatientsPercent: primaryPercent,
		averageCheckKopecks,
		averageCheckRub: Math.round(averageCheckKopecks / 100),
		averageCheckFormatted: formatKopecksRu(averageCheckKopecks),
		primaryAverageCheckKopecks: primaryAvgCheckKopecks,
		primaryAverageCheckFormatted: formatKopecksRu(primaryAvgCheckKopecks),
		repeatAverageCheckKopecks: repeatAvgCheckKopecks,
		repeatAverageCheckFormatted: formatKopecksRu(repeatAvgCheckKopecks),
		patientLtvKopecks: ltvKopecks,
		patientLtvFormatted: formatKopecksRu(ltvKopecks),
		cacKopecks,
		cacFormatted: cacKopecks > 0 ? formatKopecksRu(cacKopecks) : "0 ₽ (Органика)",
		ltvToCacRatio,
		totalMarketingSpendKopecks: mktSpend,
		totalMarketingSpendFormatted: formatKopecksRu(mktSpend),
		chairOccupancyRatePercent,
		totalOccupiedMinutes: occupiedMin,
		totalAvailableMinutes: availableMin,
		totalChairsCount: Math.max(1, params.totalChairsCount),
		leadToSanitationConversionPercent,
		aiDiagnosticRatePercent,
		cancelledVisitsCount: cancelledVisits,
		noShowVisitsCount: noShowVisits,
		cancellationRatePercent,
		totalCompletedVisits: visits,
		activeDoctorsCount: Math.max(0, params.activeDoctorsCount),
		totalLeadsCount: leads,
		totalSanitationCount: sanCount,
	};
}
