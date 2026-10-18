import React from "react";
import type { CuratorConversionMetrics, CuratorFunnelStage } from "@dental/shared";
import { Layers } from "lucide-react";
import { CuratorFunnelStageCard } from "./curatorModules/CuratorFunnelStageCard";

export interface CuratorConversionFunnelProps {
	readonly metrics: CuratorConversionMetrics;
	readonly selectedStage?: CuratorFunnelStage | "all" | undefined;
	readonly onSelectStage?: ((stage: CuratorFunnelStage | "all") => void) | undefined;
	readonly className?: string | undefined;
}

export const CuratorConversionFunnel: React.FC<CuratorConversionFunnelProps> = ({
	metrics,
	selectedStage = "all",
	onSelectStage,
	className = "",
}) => {
	const stages = metrics.stagesBreakdown;

	return (
		<div className={`curator-funnel-section ${className}`}>
			<div className="curator-funnel-header">
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<Layers className="w-5 h-5" style={{ color: "var(--accent, #6366f1)" }} />
					<h3 className="curator-funnel-title">Воронка конверсии куратора</h3>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<span style={{ fontSize: "13px", color: "var(--ink-muted, #64748b)" }}>
						Сквозная конверсия:{" "}
						<strong style={{ color: "var(--teal, #0d9488)", fontSize: "15px" }}>
							{metrics.overallConversionPercent.toFixed(1)}%
						</strong>
					</span>
					{selectedStage !== "all" && (
						<button
							type="button"
							onClick={() => onSelectStage?.("all")}
							className="curator-pill-btn active"
							style={{ minHeight: "36px", padding: "4px 10px", fontSize: "12px" }}
						>
							Сбросить фильтр
						</button>
					)}
				</div>
			</div>

			<div className="curator-funnel-stages-row">
				{stages.map((stageItem, index) => (
					<CuratorFunnelStageCard
						key={stageItem.stage}
						stageItem={stageItem}
						index={index}
						isSelected={selectedStage === stageItem.stage}
						onSelectStage={onSelectStage}
					/>
				))}
			</div>
		</div>
	);
};
