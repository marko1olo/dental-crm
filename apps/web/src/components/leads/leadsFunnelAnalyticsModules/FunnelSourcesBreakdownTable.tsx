import { FunnelBudgetAdjuster } from "../FunnelBudgetAdjuster";
import { FunnelChannelsTableSection } from "../FunnelChannelsTableSection";
import type {
	CanonicalMarketingChannelKey,
	ChannelFunnelMetrics,
	ChannelSpendMap,
	FunnelSummaryMetrics,
} from "./types";

export interface FunnelBudgetAdjusterPanelProps {
	readonly isOpen: boolean;
	readonly customSpends: ChannelSpendMap;
	readonly onBudgetChange: (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => void;
	readonly onResetBudgets: () => void;
}

export function FunnelBudgetAdjusterPanel({
	isOpen,
	customSpends,
	onBudgetChange,
	onResetBudgets,
}: FunnelBudgetAdjusterPanelProps) {
	return (
		<FunnelBudgetAdjuster
			isOpen={isOpen}
			customSpends={customSpends}
			onBudgetChange={onBudgetChange}
			onResetBudgets={onResetBudgets}
		/>
	);
}

export interface FunnelSourcesBreakdownTableProps {
	readonly channels: readonly ChannelFunnelMetrics[];
	readonly summary: FunnelSummaryMetrics;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export function FunnelSourcesBreakdownTable({
	channels,
	summary,
	isOpen,
	onToggle,
}: FunnelSourcesBreakdownTableProps) {
	return (
		<FunnelChannelsTableSection
			channels={channels}
			summary={summary}
			isOpen={isOpen}
			onToggle={onToggle}
		/>
	);
}
