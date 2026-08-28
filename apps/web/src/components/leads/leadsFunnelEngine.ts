/**
 * CRM END-TO-END FUNNEL & MARKETING INTELLIGENCE ENGINE (ДЕНТЕ CRM)
 *
 * Движок сквозной аналитики воронки пациентов и рекламных каналов.
 *
 * ЭТАПЫ ВОРОНКИ (6 базовых клинических стадий):
 * 1. `new`                  — Новые обращения (лид получен)
 * 2. `contacted`            — В работе / Квалифицированы оператором
 * 3. `consult_booked`       — Записаны на первичную консультацию
 * 4. `showed_up`            — Дошли до клиники (Show-up / Визит состоялся)
 * 5. `treatment_plan_accepted` — Согласован комплексный план лечения
 * 6. `paid`                 — Оплачено в кассу (первичный платеж внесен)
 *
 * СТРОГИЕ ПРАВИЛА:
 * - Все финансовые расчеты ведутся с точностью до копеек и рублей (без NaN / Infinity).
 * - Защита от деления на 0 во всех конверсиях и метриках (CPL, CAC, CPS, ROMI, LTV).
 * - Каноническая нормализация рекламных каналов РФ (Яндекс.Директ, 2ГИС, ПроДокторов, НаПоправку, SEO, Сарафан).
 * - 100% покрытие типов TypeScript без loose any.
 */

// ---------------------------------------------------------------------------
// 1. ТИПЫ И КЛЮЧИ ЭТАПОВ ВОРОНКИ
// ---------------------------------------------------------------------------

export type LeadFunnelStageKey =
	| "new"
	| "contacted"
	| "consult_booked"
	| "showed_up"
	| "treatment_plan_accepted"
	| "paid";

export interface FunnelStageConfig {
	readonly key: LeadFunnelStageKey;
	readonly index: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly color: string;
	readonly badgeColor: string;
}

export const FUNNEL_STAGES: readonly FunnelStageConfig[] = [
	{
		key: "new",
		index: 0,
		label: "1. Новые обращения",
		shortLabel: "Лид получен",
		description: "Входящие заявки со всех каналов маркетинга",
		color: "var(--brand-500, #0f766e)",
		badgeColor: "rgba(15, 118, 110, 0.15)",
	},
	{
		key: "contacted",
		index: 1,
		label: "2. В работе / Квалифицированы",
		shortLabel: "Квалифицирован",
		description: "Установлен контакт, выявлена потребность",
		color: "var(--accent, #3b82f6)",
		badgeColor: "rgba(59, 130, 246, 0.15)",
	},
	{
		key: "consult_booked",
		index: 2,
		label: "3. Записаны на прием",
		shortLabel: "Записан",
		description: "Назначено время в расписании и кресло врача",
		color: "var(--indigo, #6366f1)",
		badgeColor: "rgba(99, 102, 241, 0.15)",
	},
	{
		key: "showed_up",
		index: 3,
		label: "4. Дошли до клиники (Show-up)",
		shortLabel: "Дошел (Show-up)",
		description: "Пациент явился на консультацию / осмотр",
		color: "var(--warning, #f59e0b)",
		badgeColor: "rgba(245, 158, 11, 0.15)",
	},
	{
		key: "treatment_plan_accepted",
		index: 4,
		label: "5. Согласован план лечения",
		shortLabel: "План принят",
		description: "Смета и план лечения утверждены пациентом",
		color: "var(--purple, #8b5cf6)",
		badgeColor: "rgba(139, 92, 246, 0.15)",
	},
	{
		key: "paid",
		index: 5,
		label: "6. Оплачено в кассу",
		shortLabel: "Оплачено",
		description: "Внесена оплата / первичный чек пробит через 54-ФЗ",
		color: "var(--success, #10b981)",
		badgeColor: "rgba(16, 185, 129, 0.15)",
	},
] as const;

// ---------------------------------------------------------------------------
// 2. МАРКЕТИНГОВЫЕ КАНАЛЫ
// ---------------------------------------------------------------------------

export type CanonicalMarketingChannelKey =
	| "yandex_direct"
	| "gis_2"
	| "prodoctorov"
	| "napopravku"
	| "site_seo"
	| "recommendations"
	| "social_media"
	| "other";

export interface MarketingChannelMeta {
	readonly key: CanonicalMarketingChannelKey;
	readonly label: string;
	readonly defaultSpendRub: number;
	readonly color: string;
	readonly iconType: string;
}

export const MARKETING_CHANNELS: readonly MarketingChannelMeta[] = [
	{
		key: "yandex_direct",
		label: "Яндекс.Директ",
		defaultSpendRub: 75000,
		color: "#fc3f1d",
		iconType: "yandex",
	},
	{
		key: "gis_2",
		label: "2ГИС Карты",
		defaultSpendRub: 35000,
		color: "#72bf44",
		iconType: "map",
	},
	{
		key: "prodoctorov",
		label: "ПроДокторов",
		defaultSpendRub: 30000,
		color: "#00a0e3",
		iconType: "award",
	},
	{
		key: "napopravku",
		label: "НаПоправку",
		defaultSpendRub: 15000,
		color: "#ff5e00",
		iconType: "heart",
	},
	{
		key: "site_seo",
		label: "Сайт / SEO",
		defaultSpendRub: 40000,
		color: "#10b981",
		iconType: "globe",
	},
	{
		key: "recommendations",
		label: "Рекомендации / Сарафан",
		defaultSpendRub: 0,
		color: "#8b5cf6",
		iconType: "users",
	},
	{
		key: "social_media",
		label: "Соцсети / VK / TG",
		defaultSpendRub: 25000,
		color: "#0077ff",
		iconType: "message",
	},
	{
		key: "other",
		label: "Прочие / Прямой звонок",
		defaultSpendRub: 5000,
		color: "#64748b",
		iconType: "phone",
	},
] as const;

/**
 * Нормализация строкового названия источника лида в канонический ключ рекламного канала.
 */
export function normalizeMarketingChannel(
	rawSource?: string | null,
): CanonicalMarketingChannelKey {
	if (!rawSource || typeof rawSource !== "string") {
		return "other";
	}
	const s = rawSource.trim().toLowerCase();
	if (!s) return "other";

	if (
		s.includes("директ") ||
		s.includes("direct") ||
		s.includes("яндекс") ||
		s.includes("yandex") ||
		s.includes("рся")
	) {
		return "yandex_direct";
	}
	if (
		s.includes("2gis") ||
		s.includes("2гис") ||
		s.includes("2 гис") ||
		s.includes("двойс") ||
		s.includes("дубльгис")
	) {
		return "gis_2";
	}
	if (s.includes("продокторов") || s.includes("prodoctorov")) {
		return "prodoctorov";
	}
	if (s.includes("напоправку") || s.includes("napopravku")) {
		return "napopravku";
	}
	if (
		s.includes("сайт") ||
		s.includes("site") ||
		s.includes("seo") ||
		s.includes("органика") ||
		s.includes("organic") ||
		s.includes("веб") ||
		s.includes("лендинг") ||
		s.includes("google") ||
		s.includes("гугл")
	) {
		return "site_seo";
	}
	if (
		s.includes("сарафан") ||
		s.includes("рекомендац") ||
		s.includes("друг") ||
		s.includes("знаком") ||
		s.includes("совет") ||
		s.includes("пациент")
	) {
		return "recommendations";
	}
	if (
		/\b(vk|tg|smm|instagram)\b/i.test(s) ||
		s.includes("вконтакте") ||
		s.includes("телеграм") ||
		s.includes("telegram") ||
		s.includes("инстаграм") ||
		s.includes("инста") ||
		/(?:^|\s)(?:вк|тг)(?:\s|$)/i.test(s)
	) {
		return "social_media";
	}

	return "other";
}

/** Получение читаемой метки рекламного канала */
export function getMarketingChannelLabel(
	channelKey: CanonicalMarketingChannelKey,
): string {
	const match = MARKETING_CHANNELS.find((c) => c.key === channelKey);
	return match ? match.label : "Прочие";
}

// ---------------------------------------------------------------------------
// 3. ВХОДНЫЕ ДАННЫЕ ЛИДА ДЛЯ ВОРОНКИ
// ---------------------------------------------------------------------------

export interface FunnelLead {
	id: string;
	name: string;
	phone?: string;
	source?: string;
	status: "new" | "contacted" | "consult_booked" | "no_answer" | "trash" | string;
	expectedRevenue?: string | number | null;
	createdAt?: string | Date | null;
	// Дополнительные параметры клинического трекинга
	showedUp?: boolean;
	treatmentPlanAgreed?: boolean;
	isPaid?: boolean;
	paidAmountRub?: number;
	paidAmountKopecks?: number;
	actualRevenueRub?: number;
	stageReached?: LeadFunnelStageKey;
}

// ---------------------------------------------------------------------------
// 4. ОПРЕДЕЛЕНИЕ ДОСТИГНУТОГО ЭТАПА
// ---------------------------------------------------------------------------

/**
 * Определяет максимальный достигнутый этап воронки для лида.
 */
export function detectLeadStage(lead: FunnelLead): LeadFunnelStageKey {
	if (lead.stageReached) {
		return lead.stageReached;
	}

	const paidVal =
		lead.paidAmountRub ??
		(lead.paidAmountKopecks ? lead.paidAmountKopecks / 100 : 0);
	if (lead.isPaid || paidVal > 0) {
		return "paid";
	}

	if (lead.treatmentPlanAgreed) {
		return "treatment_plan_accepted";
	}

	if (lead.showedUp) {
		return "showed_up";
	}

	if (lead.status === "consult_booked") {
		return "consult_booked";
	}

	if (lead.status === "contacted" || lead.status === "no_answer") {
		return "contacted";
	}

	return "new";
}

/**
 * Проверяет, прошел ли лид указанный этап воронки.
 * Сквозная логика: если лид на этапе 5 (paid), он гарантированно прошел этапы 0, 1, 2, 3, 4, 5.
 */
export function hasLeadPassedStage(
	leadStage: LeadFunnelStageKey,
	targetStage: LeadFunnelStageKey,
): boolean {
	const stageOrder: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 1,
		consult_booked: 2,
		showed_up: 3,
		treatment_plan_accepted: 4,
		paid: 5,
	};
	return stageOrder[leadStage] >= stageOrder[targetStage];
}

// ---------------------------------------------------------------------------
// 5. ВРЕМЕННЫЕ ПЕРИОДЫ
// ---------------------------------------------------------------------------

export type FunnelTimePeriod =
	| "today"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "all";

export const FUNNEL_PERIOD_OPTIONS: readonly {
	id: FunnelTimePeriod;
	label: string;
	days: number;
}[] = [
	{ id: "today", label: "Сегодня", days: 1 },
	{ id: "week", label: "7 дней", days: 7 },
	{ id: "month", label: "Месяц (30 дн.)", days: 30 },
	{ id: "quarter", label: "Квартал (90 дн.)", days: 90 },
	{ id: "year", label: "Год", days: 365 },
	{ id: "all", label: "Все время", days: 0 },
] as const;

/**
 * Фильтрация массива лидов по выбранному периоду.
 */
export function filterLeadsByPeriod(
	leads: readonly FunnelLead[],
	period: FunnelTimePeriod,
	referenceDate: Date = new Date(),
): FunnelLead[] {
	if (period === "all") {
		return [...leads];
	}

	const refTime = referenceDate.getTime();
	let startThresholdMs: number;

	if (period === "today") {
		const startOfToday = new Date(
			referenceDate.getFullYear(),
			referenceDate.getMonth(),
			referenceDate.getDate(),
		);
		startThresholdMs = startOfToday.getTime();
	} else if (period === "week") {
		startThresholdMs = refTime - 7 * 24 * 60 * 60 * 1000;
	} else if (period === "month") {
		startThresholdMs = refTime - 30 * 24 * 60 * 60 * 1000;
	} else if (period === "quarter") {
		startThresholdMs = refTime - 90 * 24 * 60 * 60 * 1000;
	} else if (period === "year") {
		startThresholdMs = refTime - 365 * 24 * 60 * 60 * 1000;
	} else {
		return [...leads];
	}

	return leads.filter((lead) => {
		if (!lead.createdAt) {
			return true;
		}
		const createdTime = new Date(lead.createdAt).getTime();
		if (Number.isNaN(createdTime)) {
			return true;
		}
		return createdTime >= startThresholdMs && createdTime <= refTime + 60000;
	});
}

// ---------------------------------------------------------------------------
// 6. СТРУКТУРЫ РЕЗУЛЬТАТОВ РАСЧЕТА
// ---------------------------------------------------------------------------

export interface FunnelStageMetric {
	readonly key: LeadFunnelStageKey;
	readonly index: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly color: string;
	readonly badgeColor: string;
	readonly count: number;
	readonly dropCount: number;
	readonly dropRatePercent: number;
	readonly conversionFromFirstPercent: number;
	readonly conversionFromPrevPercent: number;
}

export interface MarketingMetricsSummary {
	readonly totalLeads: number;
	readonly contactedLeads: number;
	readonly bookedLeads: number;
	readonly showUpLeads: number;
	readonly agreedPlanLeads: number;
	readonly paidLeads: number;
	// Конверсии
	readonly showUpRatePercent: number;
	readonly bookingRatePercent: number;
	readonly planAcceptanceRatePercent: number;
	readonly overallConversionPercent: number;
	// Финансы
	readonly totalMarketingSpendRub: number;
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	readonly avgBillRub: number;
	readonly netMarketingProfitRub: number;
	// Маркетинговые юнит-метрики
	readonly cplRub: number; // Cost Per Lead
	readonly cpsRub: number; // Cost Per Show-up
	readonly cacRub: number; // Customer Acquisition Cost
	readonly romiPercent: number; // Return on Marketing Investment %
	readonly ltvEstimatedRub: number; // Прогнозируемый LTV (3 года)
	readonly ltvToCacRatio: number; // Отношение LTV / CAC
}

export type ChannelEfficiencyRating =
	| "excellent"
	| "good"
	| "warning"
	| "critical"
	| "organic";

export interface ChannelFunnelMetric {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly color: string;
	readonly spendRub: number;
	readonly leadsCount: number;
	readonly bookedCount: number;
	readonly showUpCount: number;
	readonly agreedCount: number;
	readonly paidCount: number;
	// Показатели
	readonly conversionRatePercent: number;
	readonly showUpRatePercent: number;
	readonly revenueRub: number;
	readonly avgBillRub: number;
	readonly cplRub: number;
	readonly cacRub: number;
	readonly romiPercent: number;
	readonly efficiencyRating: ChannelEfficiencyRating;
	readonly recommendation: string;
}

export interface FunnelAnalysisResult {
	readonly period: FunnelTimePeriod;
	readonly filteredLeadsCount: number;
	readonly stages: readonly FunnelStageMetric[];
	readonly summary: MarketingMetricsSummary;
	readonly channels: readonly ChannelFunnelMetric[];
}

export type ChannelSpendMap = Partial<
	Record<CanonicalMarketingChannelKey | string, number>
>;

// ---------------------------------------------------------------------------
// 7. ОСНОВНОЙ ДВИЖОК РАСЧЕТА
// ---------------------------------------------------------------------------

/**
 * Получение стандартного набора рекламных бюджетов по умолчанию
 */
export function getDefaultChannelSpendMap(): Record<
	CanonicalMarketingChannelKey,
	number
> {
	const map = {} as Record<CanonicalMarketingChannelKey, number>;
	for (const ch of MARKETING_CHANNELS) {
		map[ch.key] = ch.defaultSpendRub;
	}
	return map;
}

/**
 * Безопасное деление двух чисел с округлением до 2 знаков после запятой
 */
export function safePercent(
	numerator: number,
	denominator: number,
	decimals = 1,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = (numerator / denominator) * 100;
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Безопасное деление для расчета средних и стоимостей (рубли)
 */
export function safeDivide(
	numerator: number,
	denominator: number,
	decimals = 0,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = numerator / denominator;
	if (decimals === 0) {
		return Math.round(val);
	}
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Извлекает числовую выручку по лиду (в рублях)
 */
export function extractLeadRevenueRub(lead: FunnelLead): number {
	if (typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0) {
		return Math.round(lead.actualRevenueRub);
	}
	if (typeof lead.paidAmountRub === "number" && lead.paidAmountRub > 0) {
		return Math.round(lead.paidAmountRub);
	}
	if (
		typeof lead.paidAmountKopecks === "number" &&
		lead.paidAmountKopecks > 0
	) {
		return Math.round(lead.paidAmountKopecks / 100);
	}
	if (lead.expectedRevenue) {
		const num = Number(lead.expectedRevenue);
		if (Number.isFinite(num) && num > 0) {
			return Math.round(num);
		}
	}
	return 0;
}

/**
 * Оценка эффективности рекламного канала
 */
export function evaluateChannelEfficiency(
	spendRub: number,
	paidCount: number,
	romiPercent: number,
): { rating: ChannelEfficiencyRating; recommendation: string } {
	if (spendRub <= 0) {
		return {
			rating: "organic",
			recommendation: "Бесплатный/органический трафик. Развивать реферальные программы.",
		};
	}
	if (paidCount === 0) {
		return {
			rating: "critical",
			recommendation: "0 продаж при наличии расходов. Проверить скрипты и квалификацию лидов.",
		};
	}
	if (romiPercent >= 300) {
		return {
			rating: "excellent",
			recommendation: "Сверхвысокая окупаемость (>300%). Масштабировать рекламный бюджет.",
		};
	}
	if (romiPercent >= 100) {
		return {
			rating: "good",
			recommendation: "Рентабельный канал. Удерживать объем и оптимизировать CPL.",
		};
	}
	if (romiPercent >= 0) {
		return {
			rating: "warning",
			recommendation: "Работает в ноль/слабый плюс. Требуется повышение среднего чека.",
		};
	}
	return {
		rating: "critical",
		recommendation: "Отрицательный ROMI. Пересмотреть посадочные страницы или снизить ставки.",
	};
}

/**
 * Комплексный расчет сквозной воронки лидов и маркетинговой аналитики
 */
export function calculateFunnelAnalysis(
	rawLeads: readonly FunnelLead[],
	period: FunnelTimePeriod = "all",
	customSpendMap?: ChannelSpendMap,
	referenceDate: Date = new Date(),
): FunnelAnalysisResult {
	const leads = filterLeadsByPeriod(rawLeads, period, referenceDate);
	const defaultSpends = getDefaultChannelSpendMap();

	// Объединяем бюджеты
	const channelSpends: Record<CanonicalMarketingChannelKey, number> = {
		yandex_direct:
			customSpendMap?.yandex_direct ?? defaultSpends.yandex_direct,
		gis_2: customSpendMap?.gis_2 ?? defaultSpends.gis_2,
		prodoctorov: customSpendMap?.prodoctorov ?? defaultSpends.prodoctorov,
		napopravku: customSpendMap?.napopravku ?? defaultSpends.napopravku,
		site_seo: customSpendMap?.site_seo ?? defaultSpends.site_seo,
		recommendations:
			customSpendMap?.recommendations ?? defaultSpends.recommendations,
		social_media: customSpendMap?.social_media ?? defaultSpends.social_media,
		other: customSpendMap?.other ?? defaultSpends.other,
	};

	// 1. Определение этапов для каждого лида
	const leadsWithStages = leads.map((lead) => ({
		lead,
		stage: detectLeadStage(lead),
		channel: normalizeMarketingChannel(lead.source),
		revenueRub: extractLeadRevenueRub(lead),
	}));

	// 2. Расчет счетчиков этапов
	const stageCounts: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};

	for (const item of leadsWithStages) {
		for (const stageCfg of FUNNEL_STAGES) {
			if (hasLeadPassedStage(item.stage, stageCfg.key)) {
				stageCounts[stageCfg.key] += 1;
			}
		}
	}

	const totalLeadsCount = stageCounts.new;

	// 3. Формирование поэтапной воронки
	const stages: FunnelStageMetric[] = FUNNEL_STAGES.map((cfg, idx) => {
		const count = stageCounts[cfg.key] ?? 0;
		const nextStageCfg = FUNNEL_STAGES[idx + 1];
		const nextCount = nextStageCfg ? (stageCounts[nextStageCfg.key] ?? 0) : 0;
		const dropCount = idx < FUNNEL_STAGES.length - 1 ? Math.max(0, count - nextCount) : 0;
		const dropRatePercent = safePercent(dropCount, count);

		const prevStageCfg = idx > 0 ? FUNNEL_STAGES[idx - 1] : undefined;
		const prevCount = prevStageCfg ? (stageCounts[prevStageCfg.key] ?? count) : count;
		const conversionFromPrevPercent =
			idx === 0 ? 100 : safePercent(count, prevCount);
		const conversionFromFirstPercent = safePercent(count, totalLeadsCount);

		return {
			key: cfg.key,
			index: cfg.index,
			label: cfg.label,
			shortLabel: cfg.shortLabel,
			color: cfg.color,
			badgeColor: cfg.badgeColor,
			count,
			dropCount,
			dropRatePercent,
			conversionFromFirstPercent,
			conversionFromPrevPercent,
		};
	});

	// 4. Финансовые и маркетинговые суммы
	let totalMarketingSpendRub = 0;
	for (const key of Object.keys(channelSpends) as CanonicalMarketingChannelKey[]) {
		totalMarketingSpendRub += channelSpends[key];
	}

	let totalRevenueRub = 0;
	for (const item of leadsWithStages) {
		if (hasLeadPassedStage(item.stage, "paid")) {
			totalRevenueRub += item.revenueRub;
		}
	}

	const paidLeads = stageCounts.paid;
	const bookedLeads = stageCounts.consult_booked;
	const showUpLeads = stageCounts.showed_up;
	const contactedLeads = stageCounts.contacted;
	const agreedPlanLeads = stageCounts.treatment_plan_accepted;

	const showUpRatePercent = safePercent(showUpLeads, bookedLeads);
	const bookingRatePercent = safePercent(bookedLeads, totalLeadsCount);
	const planAcceptanceRatePercent = safePercent(agreedPlanLeads, showUpLeads);
	const overallConversionPercent = safePercent(paidLeads, totalLeadsCount);

	const avgBillRub = safeDivide(totalRevenueRub, paidLeads);
	const cplRub = safeDivide(totalMarketingSpendRub, totalLeadsCount);
	const cpsRub = safeDivide(totalMarketingSpendRub, showUpLeads);
	const cacRub = safeDivide(totalMarketingSpendRub, paidLeads);

	const netMarketingProfitRub = totalRevenueRub - totalMarketingSpendRub;
	const romiPercent =
		totalMarketingSpendRub > 0
			? safePercent(netMarketingProfitRub, totalMarketingSpendRub)
			: 0;

	// Стоматологический множитель LTV (в среднем пациент оставляет 2.5x от первичного чека за 3 года)
	const ltvEstimatedRub = Math.round(avgBillRub * 2.5);
	const ltvToCacRatio = cacRub > 0 ? safeDivide(ltvEstimatedRub, cacRub, 1) : 0;

	const summary: MarketingMetricsSummary = {
		totalLeads: totalLeadsCount,
		contactedLeads,
		bookedLeads,
		showUpLeads,
		agreedPlanLeads,
		paidLeads,
		showUpRatePercent,
		bookingRatePercent,
		planAcceptanceRatePercent,
		overallConversionPercent,
		totalMarketingSpendRub,
		totalRevenueRub,
		totalRevenueKopecks: totalRevenueRub * 100,
		avgBillRub,
		netMarketingProfitRub,
		cplRub,
		cpsRub,
		cacRub,
		romiPercent,
		ltvEstimatedRub,
		ltvToCacRatio,
	};

	// 5. Расчет по маркетинговым каналам
	const channels: ChannelFunnelMetric[] = MARKETING_CHANNELS.map((ch) => {
		const channelLeads = leadsWithStages.filter((l) => l.channel === ch.key);
		const spendRub = channelSpends[ch.key] ?? 0;

		let leadsCount = 0;
		let bookedCount = 0;
		let showUpCount = 0;
		let agreedCount = 0;
		let paidCount = 0;
		let revenueRub = 0;

		for (const item of channelLeads) {
			leadsCount += 1;
			if (hasLeadPassedStage(item.stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(item.stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(item.stage, "treatment_plan_accepted")) agreedCount += 1;
			if (hasLeadPassedStage(item.stage, "paid")) {
				paidCount += 1;
				revenueRub += item.revenueRub;
			}
		}

		const conversionRatePercent = safePercent(paidCount, leadsCount);
		const showUpRatePercent = safePercent(showUpCount, bookedCount);
		const avgBill = safeDivide(revenueRub, paidCount);
		const cpl = safeDivide(spendRub, leadsCount);
		const cac = safeDivide(spendRub, paidCount);
		const netProfit = revenueRub - spendRub;
		const romi = spendRub > 0 ? safePercent(netProfit, spendRub) : 0;

		const { rating, recommendation } = evaluateChannelEfficiency(
			spendRub,
			paidCount,
			romi,
		);

		return {
			channelKey: ch.key,
			channelLabel: ch.label,
			color: ch.color,
			spendRub,
			leadsCount,
			bookedCount,
			showUpCount,
			agreedCount,
			paidCount,
			conversionRatePercent,
			showUpRatePercent,
			revenueRub,
			avgBillRub: avgBill,
			cplRub: cpl,
			cacRub: cac,
			romiPercent: romi,
			efficiencyRating: rating,
			recommendation,
		};
	});

	return {
		period,
		filteredLeadsCount: leads.length,
		stages,
		summary,
		channels,
	};
}

// ---------------------------------------------------------------------------
// 8. ЭКСПОРТ ОТЧЕТОВ (CSV И ТЕКСТ)
// ---------------------------------------------------------------------------

/**
 * Экспорт результатов сквозной воронки в CSV (BOM \uFEFF для корректного открытия в Excel РФ)
 */
export function exportFunnelReportCsv(result: FunnelAnalysisResult): string {
	const lines: string[] = [];

	// BOM для UTF-8
	const bom = "\uFEFF";

	lines.push("ОТЧЕТ СКВОЗНОЙ ВОРОНКИ И МАРКЕТИНГОВОЙ АНАЛИТИКИ CRM ДЕНТЕ");
	lines.push(`Период:;${result.period};Всего обращений в выборке:;${result.filteredLeadsCount}`);
	lines.push("");

	// 1. Сводные метрики
	lines.push("1. КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ МАРКЕТИНГА И ПРОДАЖ");
	lines.push("Показатель;Значение;Единица измерения");
	lines.push(`Всего обращений (Leads);${result.summary.totalLeads};шт.`);
	lines.push(`Записано на консультацию;${result.summary.bookedLeads};шт.`);
	lines.push(`Конверсия в запись;${result.summary.bookingRatePercent}%;%`);
	lines.push(`Дошли до клиники (Show-up);${result.summary.showUpLeads};шт.`);
	lines.push(`Доходимость (Show-up rate);${result.summary.showUpRatePercent}%;%`);
	lines.push(`Согласован план лечения;${result.summary.agreedPlanLeads};шт.`);
	lines.push(`Принятие плана лечения;${result.summary.planAcceptanceRatePercent}%;%`);
	lines.push(`Оплатившие клиенты;${result.summary.paidLeads};пациентов`);
	lines.push(`Итоговая конверсия в оплату;${result.summary.overallConversionPercent}%;%`);
	lines.push(`Рекламный бюджет (Маркетинг);${result.summary.totalMarketingSpendRub};руб.`);
	lines.push(`Фактическая выручка;${result.summary.totalRevenueRub};руб.`);
	lines.push(`Чистая прибыль от маркетинга;${result.summary.netMarketingProfitRub};руб.`);
	lines.push(`Средний чек первичного пациента;${result.summary.avgBillRub};руб.`);
	lines.push(`Стоимость лида (CPL);${result.summary.cplRub};руб.`);
	lines.push(`Стоимость дошедшего (CPS);${result.summary.cpsRub};руб.`);
	lines.push(`Стоимость привлечения клиента (CAC);${result.summary.cacRub};руб.`);
	lines.push(`Возврат инвестиций (ROMI);${result.summary.romiPercent}%;%`);
	lines.push(`Прогнозируемый LTV (3 года);${result.summary.ltvEstimatedRub};руб.`);
	lines.push(`Отношение LTV / CAC;${result.summary.ltvToCacRatio};x`);
	lines.push("");

	// 2. Этапы воронки
	lines.push("2. ЭТАПЫ СКВОЗНОЙ ВОРОНКИ ПАЦИЕНТОВ");
	lines.push("Этап;Количество;Конверсия от входа (%);Пошаговая конверсия (%);Отвал (Drop-off шт);Отвал (%)");
	for (const st of result.stages) {
		lines.push(
			`"${st.label}";${st.count};${st.conversionFromFirstPercent}%;${st.conversionFromPrevPercent}%;${st.dropCount};${st.dropRatePercent}%`,
		);
	}
	lines.push("");

	// 3. Маркетинговые каналы
	lines.push("3. ЭФФЕКТИВНОСТЬ РЕКЛАМНЫХ КАНАЛОВ");
	lines.push(
		"Рекламный канал;Расход (руб);Лидов;Записей;Дошли;Оплатили;Конверсия (%);Выручка (руб);Ср. чек (руб);CPL (руб);CAC (руб);ROMI (%);Оценка;Рекомендация",
	);
	for (const ch of result.channels) {
		lines.push(
			`"${ch.channelLabel}";${ch.spendRub};${ch.leadsCount};${ch.bookedCount};${ch.showUpCount};${ch.paidCount};${ch.conversionRatePercent}%;${ch.revenueRub};${ch.avgBillRub};${ch.cplRub};${ch.cacRub};${ch.romiPercent}%;"${ch.efficiencyRating}";"${ch.recommendation}"`,
		);
	}

	return bom + lines.join("\r\n");
}

/**
 * Текстовый дайджест для руководства клиники / маркетолога
 */
export function exportFunnelReportSummaryText(
	result: FunnelAnalysisResult,
): string {
	const s = result.summary;
	return [
		`📊 ДАЙДЖЕСТ ВОРОНКИ ПАЦИЕНТОВ CRM ДЕНТЕ (Период: ${result.period})`,
		"--------------------------------------------------",
		`🎯 Лидов получено: ${s.totalLeads} | Записано: ${s.bookedLeads} (${s.bookingRatePercent}%)`,
		`🏥 Дошли до клиники: ${s.showUpLeads} (Show-up: ${s.showUpRatePercent}%)`,
		`💳 Оплатили лечение: ${s.paidLeads} (Итоговая конверсия: ${s.overallConversionPercent}%)`,
		"--------------------------------------------------",
		`💰 Расходы на рекламу: ${s.totalMarketingSpendRub.toLocaleString("ru-RU")} ₽`,
		`💵 Выручка: ${s.totalRevenueRub.toLocaleString("ru-RU")} ₽`,
		`📈 ROMI: ${s.romiPercent}% | Чистая выгода: ${s.netMarketingProfitRub.toLocaleString("ru-RU")} ₽`,
		`🏷️ Ср. чек: ${s.avgBillRub.toLocaleString("ru-RU")} ₽ | CAC: ${s.cacRub.toLocaleString("ru-RU")} ₽ | CPL: ${s.cplRub.toLocaleString("ru-RU")} ₽`,
		`⭐ LTV (3 года): ${s.ltvEstimatedRub.toLocaleString("ru-RU")} ₽ (LTV/CAC: ${s.ltvToCacRatio}x)`,
		"--------------------------------------------------",
	].join("\n");
}
