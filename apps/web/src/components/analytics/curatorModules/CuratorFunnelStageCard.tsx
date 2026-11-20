import React from "react";
import {
	type CuratorStageStats,
	type CuratorFunnelStage,
	CURATOR_STAGE_DEFINITIONS,
} from "@dental/shared";
import { Clock, TrendingUp } from "lucide-react";

export interface CuratorFunnelStageCardProps {
	readonly stageItem: CuratorStageStats;
	readonly index: number;
	readonly isSelected: boolean;
	readonly onSelectStage?: ((stage: CuratorFunnelStage) => void) | undefined;
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
				<span className="text-[13px] font-medium text-[var(--ink-muted)]">пл.</span>
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
				<div className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] mt-1">
					<Clock className="w-3 h-3" />
					<span>~{stageItem.avgDaysInStage} дн. в этапе</span>
				</div>
			)}
		</div>
	);
};
