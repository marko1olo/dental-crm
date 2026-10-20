/**
 * MARKETING DASHBOARD MODULES: TYPES
 *
 * Layer 0: Типы данных для каналов трафика (Yandex/VK/ProDoctorov/2GIS),
 * CAC, LTV, ROMI, конверсий этапов воронки первичных пациентов и пропсов компонентов.
 */

import type {
	ChannelFunnelMetric,
	FunnelStageMetric,
	FunnelTimePeriod,
	MarketingMetricsSummary,
} from "../../components/leads/leadsFunnelEngine";

export type {
	ChannelFunnelMetric,
	FunnelStageMetric,
	FunnelTimePeriod,
	MarketingMetricsSummary,
};

/**
 * Пропсы главного экрана маркетинговой аналитики
 */
export interface MarketingDashboardViewProps {
	readonly clinicName?: string;
	readonly onNavigateToRecalls?: () => void;
	readonly embedded?: boolean;
}

/**
 * Пропсы сетки 4 ключевых метрик KPI
 */
export interface MarketingKpiCardsGridProps {
	readonly summary: MarketingMetricsSummary;
}

/**
 * Пропсы таблицы атрибуции каналов привлечения
 */
export interface MarketingChannelAttributionTableProps {
	readonly channels: readonly ChannelFunnelMetric[];
}

/**
 * Пропсы графика этапов воронки и сплита каналов самозаписи/ресепшена
 */
export interface MarketingFunnelStagesChartProps {
	readonly stages: readonly FunnelStageMetric[];
	readonly intakeSplit: {
		readonly onlinePercent: number;
		readonly adminPercent: number;
	};
	readonly onOpenDetailedAudit: () => void;
}

/**
 * Сводка атрибуции онлайн-записи и телефонного канала
 */
export interface MarketingAttributionSummary {
	readonly onlineSharePercent: number;
	readonly adminSharePercent: number;
}

/**
 * Пропсы панели ROMI и сегментированной базы пациентов
 */
export interface MarketingRoiAndSegmentsPanelProps {
	readonly summary: MarketingMetricsSummary;
	readonly topChannel?: ChannelFunnelMetric | undefined;
	readonly onOpenLeakDetector: () => void;
	readonly onNavigateToRecalls?: (() => void) | undefined;
}

