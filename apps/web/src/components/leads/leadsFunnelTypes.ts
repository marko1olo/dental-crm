/**
 * CRM Funnel & Marketing Intelligence Types & Constants (DENTE CRM)
 *
 * Extracted per Mandate 8s (Anti-Bloat & Modular Architecture)
 */

import type { Lead, LeadStatus } from "../../store/leadsStore";
export type { Lead, LeadStatus };

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
		color: "var(--teal)",
		badgeColor: "rgba(15, 118, 110, 0.15)",
	},
	{
		key: "contacted",
		index: 1,
		label: "2. В работе / Квалифицированы",
		shortLabel: "Квалифицирован",
		description: "Установлен контакт, выявлена потребность",
		color: "var(--accent)",
		badgeColor: "rgba(59, 130, 246, 0.15)",
	},
	{
		key: "consult_booked",
		index: 2,
		label: "3. Записаны на прием",
		shortLabel: "Записан",
		description: "Назначено время в расписании и кресло врача",
		color: "var(--accent)",
		badgeColor: "rgba(99, 102, 241, 0.15)",
	},
	{
		key: "showed_up",
		index: 3,
		label: "4. Дошли до клиники (Show-up)",
		shortLabel: "Дошел (Show-up)",
		description: "Пациент явился на консультацию / осмотр",
		color: "var(--warn-fg)",
		badgeColor: "rgba(245, 158, 11, 0.15)",
	},
	{
		key: "treatment_plan_accepted",
		index: 4,
		label: "5. Согласован план лечения",
		shortLabel: "План принят",
		description: "Смета и план лечения утверждены пациентом",
		color: "var(--accent)",
		badgeColor: "rgba(139, 92, 246, 0.15)",
	},
	{
		key: "paid",
		index: 5,
		label: "6. Оплачено в кассу",
		shortLabel: "Оплачено",
		description: "Внесена оплата / первичный чек пробит через 54-ФЗ",
		color: "var(--ok-fg)",
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
	| "avito"
	| "yandex_maps"
	| "max"
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
		color: "var(--bad-fg)",
		iconType: "yandex",
	},
	{
		key: "gis_2",
		label: "2ГИС Карты",
		defaultSpendRub: 35000,
		color: "var(--ok-fg)",
		iconType: "map",
	},
	{
		key: "prodoctorov",
		label: "ПроДокторов",
		defaultSpendRub: 30000,
		color: "var(--info-fg)",
		iconType: "award",
	},
	{
		key: "napopravku",
		label: "НаПоправку",
		defaultSpendRub: 15000,
		color: "var(--warn-fg)",
		iconType: "heart",
	},
	{
		key: "site_seo",
		label: "Сайт / SEO",
		defaultSpendRub: 40000,
		color: "var(--ok-fg)",
		iconType: "globe",
	},
	{
		key: "recommendations",
		label: "Рекомендации / Сарафан",
		defaultSpendRub: 0,
		color: "var(--accent)",
		iconType: "users",
	},
	{
		key: "social_media",
		label: "Соцсети / VK / TG",
		defaultSpendRub: 25000,
		color: "var(--primary)",
		iconType: "message",
	},
	{
		key: "avito",
		label: "Авито",
		defaultSpendRub: 20000,
		color: "var(--accent)",
		iconType: "shopping-bag",
	},
	{
		key: "yandex_maps",
		label: "Яндекс.Карты / Гео",
		defaultSpendRub: 25000,
		color: "var(--bad-fg)",
		iconType: "map-pin",
	},
	{
		key: "max",
		label: "Мессенджер MAX",
		defaultSpendRub: 10000,
		color: "var(--primary)",
		iconType: "message-square",
	},
	{
		key: "other",
		label: "Прочие / Прямой звонок",
		defaultSpendRub: 5000,
		color: "var(--muted)",
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

	// Fast path: if already a canonical key
	if (
		s === "yandex_direct" ||
		s === "gis_2" ||
		s === "prodoctorov" ||
		s === "napopravku" ||
		s === "site_seo" ||
		s === "social_media" ||
		s === "recommendations" ||
		s === "avito" ||
		s === "yandex_maps" ||
		s === "max" ||
		s === "other"
	) {
		return s as CanonicalMarketingChannelKey;
	}

	if (s.includes("авито") || s.includes("avito")) {
		return "avito";
	}
	if (
		s.includes("карты") ||
		s.includes("яндекс.карты") ||
		s.includes("яндекс карты") ||
		s.includes("yandex maps") ||
		s.includes("yandex_maps") ||
		s.includes("maps.yandex") ||
		s.includes("гео")
	) {
		return "yandex_maps";
	}
	if (s.includes("max") || s.includes("макс")) {
		return "max";
	}

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

/** Список канонических причин срыва / отказа обращения (Mandates 8l, 8n) */
export const LEAD_DROP_REASONS = [
	"Дорого",
	"Далеко / Неудобная локация",
	"Передумал / Неактуально",
	"Дубль обращения",
	"Другое",
] as const;

export type LeadDropReason = (typeof LEAD_DROP_REASONS)[number];

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

export interface FunnelLead extends Omit<Partial<Lead>, "status" | "expectedRevenue" | "createdAt"> {

	id: string;
	name: string;
	phone?: string;
	source?: string;
	status: LeadStatus | string;
	expectedRevenue?: string | number | null;
	createdAt?: string | Date | null;
	showedUp?: boolean;
	treatmentPlanAgreed?: boolean;
	isPaid?: boolean;
	paidAmountRub?: number;
	paidAmountKopecks?: number;
	actualRevenueRub?: number;
	stageReached?: LeadFunnelStageKey;
}

// ---------------------------------------------------------------------------
// 4. ВРЕМЕННЫЕ ПЕРИОДЫ
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

// ---------------------------------------------------------------------------
// 5. МЕТРИКИ И РЕЗУЛЬТАТЫ
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
	readonly showUpRatePercent: number;
	readonly bookingRatePercent: number;
	readonly planAcceptanceRatePercent: number;
	readonly overallConversionPercent: number;
	readonly totalMarketingSpendRub: number;
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	readonly avgBillRub: number;
	readonly netMarketingProfitRub: number;
	readonly cplRub: number;
	readonly cpsRub: number;
	readonly cacRub: number;
	readonly romiPercent: number;
	readonly ltvEstimatedRub: number;
	readonly ltvToCacRatio: number;
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
// 6. АТРИБУЦИЯ ЛИДОВ, 152-ФЗ И ЗАЩИТА ОТ СПАМ-КОЛЛИЗИЙ
// ---------------------------------------------------------------------------

export interface LeadUtmParameters {
	readonly utm_source?: string | null | undefined;
	readonly utm_medium?: string | null | undefined;
	readonly utm_campaign?: string | null | undefined;
	readonly utm_content?: string | null | undefined;
	readonly utm_term?: string | null | undefined;
}

export interface LeadAttributionDetails {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly sourceRaw: string;
	readonly utm: LeadUtmParameters;
	readonly primaryInquiry: string | null;
	readonly hasUtmTags: boolean;
}

export interface PatientAttributionRecord {
	readonly patientName: string;
	readonly phone: string | null;
	readonly advertisingSource: string;
	readonly sourceChannelKey: CanonicalMarketingChannelKey;
	readonly primaryInquiry: string | null;
	readonly utm: LeadUtmParameters;
	readonly administrativeProfile: {
		readonly advertisingSource: string;
		readonly preferredAppointmentNote: string;
		readonly dataProcessingBasisNote: string;
		readonly utmSource?: string | null | undefined;
		readonly utmMedium?: string | null | undefined;
		readonly utmCampaign?: string | null | undefined;
	};
	readonly consents: {
		readonly medicalCareProcessing: boolean;
		readonly marketingPromotions: boolean;
	};
}

export type NotificationSuppressionType =
	| "no_marketing_consent"
	| "service_priority_suppression"
	| "rate_limit_24h"
	| "same_day_collision";

export interface NotificationSpamCollisionInput {
	readonly patientId: string;
	readonly notificationType: "service" | "marketing" | "recall";
	readonly consentMarketing?: boolean | null | undefined;
	readonly hasServiceAppointmentToday?: boolean | undefined;
	readonly lastMarketingSentAt?: string | Date | null | undefined;
	readonly messagesSentTodayCount?: number | undefined;
	readonly targetDate?: Date | undefined;
}

export interface NotificationCollisionCheckResult {
	readonly allowed: boolean;
	readonly reason?: string;
	readonly suppressionType?: NotificationSuppressionType;
	readonly hoursRemaining?: number;
}
