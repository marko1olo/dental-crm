import type React from "react";
import type { CrmLeakFunnelMetrics } from "@dental/shared";

interface Props {
	metrics: CrmLeakFunnelMetrics | null;
	totalIdentified: number;
}

export const CrmLeakKpiBar: React.FC<Props> = ({ metrics, totalIdentified }) => {
	return (
		<div className="cld-kpi-bar px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)]">
			<div className="cld-kpi-card">
				<span className="cld-kpi-label">Выявлено оттока</span>
				<span className="cld-kpi-val highlight">
					{metrics?.totalIdentifiedLeads ?? totalIdentified}
				</span>
			</div>
			<div className="cld-kpi-card">
				<span className="cld-kpi-label">Связались</span>
				<span className="cld-kpi-val">{metrics?.contactedCount ?? 0}</span>
			</div>
			<div className="cld-kpi-card">
				<span className="cld-kpi-label">Записаны на приём</span>
				<span className="cld-kpi-val success">{metrics?.rebookedCount ?? 0}</span>
			</div>
			<div className="cld-kpi-card">
				<span className="cld-kpi-label">Брошенные планы</span>
				<span className="cld-kpi-val highlight">
					{(metrics?.totalUncompletedPlanSumRub ?? 0).toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</div>
	);
};
