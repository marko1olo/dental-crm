import React from "react";
/**
 * DENTE Dental CRM — Funnel Top KPI Cards Grid
 * Mandate 8b (<= 120 lines)
 */

import { FunnelFinancialKpiCards } from "./FunnelFinancialKpiCards";
import { FunnelVolumeKpiCards } from "./FunnelVolumeKpiCards";
import type { FunnelSummaryMetrics } from "./types";

export function FunnelKpiCardsGrid({
	summary,
}: {
	summary: FunnelSummaryMetrics;
}) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
				gap: "12px",
			}}
		>
			<FunnelVolumeKpiCards summary={summary} />
			<FunnelFinancialKpiCards summary={summary} />
		</div>
	);
}
