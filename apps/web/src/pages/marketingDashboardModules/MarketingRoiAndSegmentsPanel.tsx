/**
 * MarketingRoiAndSegmentsPanel.tsx
 *
 * Layer 4: Правая колонка маркетингового дашборда:
 * Секция 3 (Окупаемость рекламы ROMI, CAC, CPL, лидер по ROMI)
 * Секция 4 (Сегментированная пациентская база и переход в триггерные сценарии).
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React from "react";
import { MarketingRoiAdCard } from "./MarketingRoiAdCard";
import { MarketingSegmentsCohortCard } from "./MarketingSegmentsCohortCard";
import type { MarketingRoiAndSegmentsPanelProps } from "./marketingDashboardTypes";

export function MarketingRoiAndSegmentsPanel({
	summary,
	topChannel,
	onOpenLeakDetector,
	onNavigateToRecalls,
}: MarketingRoiAndSegmentsPanelProps) {
	return (
		<div className="marketing-col">
			<MarketingRoiAdCard summary={summary} topChannel={topChannel} />
			<MarketingSegmentsCohortCard
				onOpenLeakDetector={onOpenLeakDetector}
				onNavigateToRecalls={onNavigateToRecalls}
			/>
		</div>
	);
}
