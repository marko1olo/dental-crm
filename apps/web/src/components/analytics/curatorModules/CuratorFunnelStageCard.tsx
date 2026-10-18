import React from "react";
import { type CuratorStageStats, CURATOR_STAGE_DEFINITIONS } from "@dental/shared";
import { Clock, TrendingUp } from "lucide-react";

export interface CuratorFunnelStageCardProps {
	readonly stageItem: CuratorStageStats;
	readonly index: number;
	readonly isSelected: boolean;
	readonly onSelectStage?: ((stage: any) => void) | undefined;
}

export const CuratorFunnelStageCard: React.FC<CuratorFunnelStageCardProps> = ({
	stageItem,
	index,
	isSelected,
	onSelectStage,
}) => {
	const def = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === stageItem.stage);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelectStage?.(stageItem.stage)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onSelectStage?.(stageItem.stage);
			}}
			className={`curator-funnel-stage-card ${isSelected ? "active" : ""}`}
		>
			<div className="curator-funnel-stage-header">
				<span className="curator-stage-number">{def?.stepNumber ?? index + 1}</span>
				<span>{def?.shortTitle ?? stageItem.title}</span>
			</div>

			<div className="curator-stage-count">
				{stageItem.count}{" "}
				<span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-muted, #64748b)" }}>пл.</span>
			</div>

			<div className="curator-stage-volume">{stageItem.totalRub.toLocaleString("ru-RU")} ₽</div>

			<div className="curator-stage-conversion">
				{index === 0 ? (
					<span>100% вход</span>
				) : (
					<>
						<TrendingUp className="w-3.5 h-3.5" />
						<span>{stageItem.conversionFromPreviousPercent.toFixed(1)}% от пред.</span>
					</>
				)}
			</div>

			{stageItem.avgDaysInStage > 0 && (
				<div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--ink-muted, #94a3b8)", marginTop: "4px" }}>
					<Clock className="w-3 h-3" />
					<span>~{stageItem.avgDaysInStage} дн. в этапе</span>
				</div>
			)}
		</div>
	);
};
