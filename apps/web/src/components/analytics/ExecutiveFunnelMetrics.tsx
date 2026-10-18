import React, { useState } from "react";
import type { ExecutiveFunnelStageItem, ExecutiveFunnelStage } from "@dental/shared";
import { ExecutiveFunnelStepCard } from "./executiveModules/ExecutiveFunnelStepCard";

export interface ExecutiveFunnelMetricsProps {
	readonly stages: readonly ExecutiveFunnelStageItem[];
	readonly onStageClick?: (stage: ExecutiveFunnelStage) => void;
}

export const ExecutiveFunnelMetrics: React.FC<ExecutiveFunnelMetricsProps> = ({
	stages,
	onStageClick,
}) => {
	const [selectedStage, setSelectedStage] = useState<ExecutiveFunnelStage | null>(null);

	const handleStageClick = (stage: ExecutiveFunnelStage) => {
		setSelectedStage((prev) => (prev === stage ? null : stage));
		if (onStageClick) {
			onStageClick(stage);
		}
	};

	const maxCount = Math.max(...stages.map((s) => s.count), 1);

	return (
		<div className="executive-funnel-list" role="region" aria-label="Сквозная воронка первичных пациентов">
			{stages.map((st, idx) => (
				<ExecutiveFunnelStepCard
					key={st.stage}
					stage={st}
					index={idx}
					totalStagesCount={stages.length}
					maxCount={maxCount}
					isSelected={selectedStage === st.stage}
					onSelect={handleStageClick}
				/>
			))}
		</div>
	);
};

export default ExecutiveFunnelMetrics;
