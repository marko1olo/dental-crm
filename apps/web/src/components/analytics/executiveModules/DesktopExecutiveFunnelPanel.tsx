import React from "react";
import { Filter } from "lucide-react";
import { ExecutiveFunnelMetrics } from "../ExecutiveFunnelMetrics";
import type { ExecutiveFunnelStageItem } from "@dental/shared";

export interface DesktopExecutiveFunnelPanelProps {
	readonly stages: readonly ExecutiveFunnelStageItem[];
}

export const DesktopExecutiveFunnelPanel: React.FC<DesktopExecutiveFunnelPanelProps> = ({ stages }) => (
	<section className="executive-panel" aria-label="Сквозная воронка первичных пациентов">
		<div className="executive-panel-header">
			<h2 className="executive-panel-title">
				<Filter size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
				Сквозная воронка первичных пациентов
			</h2>
			<span className="executive-panel-badge">8 этапов конверсии</span>
		</div>
		<ExecutiveFunnelMetrics stages={stages} />
	</section>
);
