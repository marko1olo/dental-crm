/**
 * DENTE Dental CRM — Funnel Stages Overview Section
 * Mandate 8b (<= 120 lines)
 */

import { FunnelWaterfallSection } from "../FunnelWaterfallSection";
import { FunnelKpiCardsGrid } from "./FunnelKpiCardsGrid";
import {
	FunnelModalHeaderBar,
	type FunnelModalHeaderBarProps,
} from "./FunnelModalHeaderBar";
import type { FunnelStageMetrics, FunnelSummaryMetrics } from "./types";

export { FunnelModalHeaderBar, type FunnelModalHeaderBarProps };

export interface FunnelStagesOverviewSectionProps {
	readonly summary: FunnelSummaryMetrics;
	readonly stages: readonly FunnelStageMetrics[];
	readonly isWaterfallOpen: boolean;
	readonly onToggleWaterfall: () => void;
}

export function FunnelStagesOverviewSection({
	summary,
	stages,
	isWaterfallOpen,
	onToggleWaterfall,
}: FunnelStagesOverviewSectionProps) {
	return (
		<>
			<FunnelKpiCardsGrid summary={summary} />

			<FunnelWaterfallSection
				stages={stages}
				totalLeads={summary.totalLeads}
				isOpen={isWaterfallOpen}
				onToggle={onToggleWaterfall}
			/>
		</>
	);
}
