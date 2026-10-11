import type React from "react";
import type {
	CanonicalMarketingChannelKey,
	ChannelFunnelMetrics,
	ChannelSpendMap,
	FunnelAnalysisResult,
	FunnelLead,
	FunnelStageMetrics,
	FunnelSummaryMetrics,
	FunnelTimePeriod,
	LeadFunnelStageKey,
} from "../leadsFunnelEngine";
import { FUNNEL_PERIOD_OPTIONS } from "../leadsFunnelEngine";

export {
	type CanonicalMarketingChannelKey,
	type ChannelFunnelMetrics,
	type ChannelSpendMap,
	FUNNEL_PERIOD_OPTIONS,
	type FunnelAnalysisResult,
	type FunnelLead,
	type FunnelStageMetrics,
	type FunnelSummaryMetrics,
	type FunnelTimePeriod,
	type LeadFunnelStageKey,
};

export interface LeadsFunnelAnalyticsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly leads: readonly FunnelLead[];
	readonly onOpenLeakDetector?: () => void;
}

export interface LiveMarketingChannelSpendEntry {
	readonly key?: string;
	readonly spentKopecks?: number;
}

export interface LiveMarketingAttributionPayload {
	readonly selfBookingChannels?: readonly LiveMarketingChannelSpendEntry[];
	readonly telephonyAdminFunnel?: {
		readonly spentKopecks?: number;
	} | null;
}

export interface LeadsFunnelControllerOptions {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly leads: readonly FunnelLead[];
	readonly attributionEndpoint?: string;
	readonly getRequestHeaders?: () => Record<string, string>;
}

export interface LeadsFunnelAnalyticsControllerState {
	readonly period: FunnelTimePeriod;
	readonly setPeriod: (period: FunnelTimePeriod) => void;
	readonly customSpends: ChannelSpendMap;
	readonly isBudgetDrawerOpen: boolean;
	readonly toggleBudgetDrawer: () => void;
	readonly isWaterfallOpen: boolean;
	readonly toggleWaterfall: () => void;
	readonly isChannelsTableOpen: boolean;
	readonly toggleChannelsTable: () => void;
	readonly analysis: FunnelAnalysisResult;
	readonly handleBudgetChange: (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => void;
	readonly handleResetBudgets: () => void;
	readonly handleExportCsv: () => void;
	readonly handleCopySummary: () => Promise<void>;
}

export const FUNNEL_MODAL_OVERLAY_STYLE: React.CSSProperties = {
	position: "fixed",
	inset: 0,
	zIndex: 150,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	background: "rgba(0, 0, 0, 0.65)",
	backdropFilter: "blur(6px)",
	padding: "16px",
};

export const FUNNEL_MODAL_CONTAINER_STYLE: React.CSSProperties = {
	background: "var(--paper-strong)",
	color: "var(--ink)",
	width: "1100px",
	maxWidth: "calc(100% - 32px)",
	maxHeight: "92vh",
	borderRadius: "16px",
	border: "1px solid var(--line)",
	boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
};

export const FUNNEL_MODAL_BODY_STYLE: React.CSSProperties = {
	flex: 1,
	overflowY: "auto",
	padding: "20px 24px",
	display: "flex",
	flexDirection: "column",
	gap: "24px",
};

