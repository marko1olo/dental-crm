import type { ExecutiveKpisSummary } from "@dental/shared";
import { TrendingUp } from "lucide-react";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsTypes";
import { MobileKpiCardsGrid } from "./MobileKpiCardsGrid";
import { MobilePaymentBreakdown } from "./MobilePaymentBreakdown";

export interface MobileExecutiveKpiTilesProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly kpis?: ExecutiveKpisSummary | null | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function MobileExecutiveKpiTiles({
	periodMetrics,
	kpis,
	onNavigateToSection,
}: MobileExecutiveKpiTilesProps) {
	const pb = periodMetrics.paymentBreakdown ?? {
		cashRub: 0,
		cashPercent: 0,
		cardDmsRub: 0,
		cardDmsPercent: 0,
		sbpRub: 0,
		sbpPercent: 0,
		depositRub: 0,
		depositPercent: 0,
		totalRub: 0,
	};

	return (
		<section
			className="mobile-exec-kpis-wrapper"
			aria-label="Финансовые KPI клиники"
		>
			<div className="mobile-exec-section-header">
				<span className="mobile-exec-section-title">
					Финансовые KPI клиники
				</span>
				<span className="mobile-exec-badge-health">
					<TrendingUp size={12} aria-hidden="true" /> План / Факт
				</span>
			</div>

			<MobileKpiCardsGrid
				periodMetrics={periodMetrics}
				kpis={kpis}
				onNavigateToSection={onNavigateToSection}
			/>

			<MobilePaymentBreakdown
				pb={pb}
				totalRevenueFormatted={periodMetrics.revenueFormatted}
			/>
		</section>
	);
}
