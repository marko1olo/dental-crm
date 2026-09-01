/**
 * apps/web/src/components/analytics/CuratorConversionFunnel.tsx
 *
 * Визуальная 5-этапная воронка конверсии планов лечения куратора (Фича #27).
 *  1. Первичная консультация (consultation)
 *  2. Согласование плана (plan_negotiation)
 *  3. Предоплата (prepayment)
 *  4. Старт лечения (treatment_start)
 *  5. Завершение (completed)
 */

import React from "react";
import {
	type CuratorConversionMetrics,
	type CuratorFunnelStage,
	type CuratorStageStats,
	CURATOR_STAGE_DEFINITIONS,
} from "@dental/shared";
import {
	ArrowRight,
	CheckCircle2,
	Clock,
	DollarSign,
	Layers,
	TrendingUp,
	Users,
} from "lucide-react";

export interface CuratorConversionFunnelProps {
	readonly metrics: CuratorConversionMetrics;
	readonly selectedStage?: CuratorFunnelStage | "all";
	readonly onSelectStage?: (stage: CuratorFunnelStage | "all") => void;
	readonly className?: string;
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
				{stages.map((stageItem, index) => {
					const def = CURATOR_STAGE_DEFINITIONS.find((d) => d.stage === stageItem.stage);
					const isSelected = selectedStage === stageItem.stage;
					const isLast = index === stages.length - 1;

					return (
						<div
							key={stageItem.stage}
							role="button"
							tabIndex={0}
							onClick={() => onSelectStage?.(stageItem.stage)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									onSelectStage?.(stageItem.stage);
								}
							}}
							className={`curator-funnel-stage-card ${isSelected ? "active" : ""}`}
						>
							<div className="curator-funnel-stage-header">
								<span className="curator-stage-number">{def?.stepNumber ?? index + 1}</span>
								<span>{def?.shortTitle ?? stageItem.title}</span>
							</div>

							<div className="curator-stage-count">
								{stageItem.count}{" "}
								<span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-muted, #64748b)" }}>
									пл.
								</span>
							</div>

							<div className="curator-stage-volume">
								{stageItem.totalRub.toLocaleString("ru-RU")} ₽
							</div>

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
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										fontSize: "11px",
										color: "var(--ink-muted, #94a3b8)",
										marginTop: "4px",
									}}
								>
									<Clock className="w-3 h-3" />
									<span>~{stageItem.avgDaysInStage} дн. в этапе</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
