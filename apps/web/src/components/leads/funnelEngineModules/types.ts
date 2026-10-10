/**
 * FUNNEL ENGINE MODULES: TYPES & SCHEMAS (SSOT)
 *
 * Типы метрик воронки, когорт лидов, этапов конверсии, отчетов CPL/CAC и SLA,
 * детектора утечек воронки и трекера скорости первого контакта.
 */

export * from "../leadsFunnelTypes.js";
export * from "../leadsFunnelExport.js";

import type {
	FunnelLead,
	LeadFunnelStageKey,
	CanonicalMarketingChannelKey,
} from "../leadsFunnelTypes.js";

/**
 * Статус лида по соблюдению регламента ответа (Speed-to-Lead SLA).
 * - `fresh`: < 15 минут (в пределах регламента)
 * - `warning`: 15–60 минут (требует внимания)
 * - `breached`: > 60 минут (регламент сорван)
 */
export type LeadSlaStatus = "fresh" | "warning" | "breached";

/**
 * Результат проверки отдельного лида по SLA
 */
export interface LeadSlaCheckResult {
	leadId?: string;
	status: LeadSlaStatus;
	minutesElapsed: number;
	isBreached: boolean;
	penaltyPoints: number;
}

/**
 * Сводные метрики скорости реакции администратора
 */
export interface SpeedToLeadMetrics {
	totalLeads: number;
	freshCount: number;
	warningCount: number;
	breachedCount: number;
	slaComplianceRatePercent: number;
	averageFirstResponseMinutes: number;
	medianFirstResponseMinutes: number;
	totalPenaltyPoints: number;
	adminPerformanceRating: "excellent" | "good" | "warning" | "critical";
	summaryText: string;
}

/**
 * Выявленная утечка воронки (зависший лид / упущенная выручка)
 */
export interface CrmFunnelLeak {
	leadId?: string | null;
	leadName: string;
	phone?: string | null;
	currentStage: LeadFunnelStageKey;
	source: string;
	channelKey: CanonicalMarketingChannelKey;
	hoursStalled: number;
	potentialRevenueRub: number;
	severity: "critical" | "warning";
	reason: string;
	suggestedAction: string;
}

/**
 * Сводный отчет детектора утечек выручки на этапе администратора
 */
export interface CrmFunnelLeakReport {
	totalLeakedCount: number;
	totalLeakedRevenueRub: number;
	criticalLeaksCount: number;
	warningLeaksCount: number;
	leaksByStage: Record<LeadFunnelStageKey, number>;
	leaks: CrmFunnelLeak[];
	summaryText: string;
}

/**
 * Прогноз доходимости (Show-Up) по рекламному источнику
 */
export interface SourceShowUpPrediction {
	channelKey: CanonicalMarketingChannelKey;
	channelLabel: string;
	bookedCount: number;
	predictedShowUpCount: number;
	predictedShowUpRatePercent: number;
	confidence: "high" | "medium" | "low";
}
