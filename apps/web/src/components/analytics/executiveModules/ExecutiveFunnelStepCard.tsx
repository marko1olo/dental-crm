import React from "react";
import type { ExecutiveFunnelStageItem, ExecutiveFunnelStage } from "@dental/shared";
import { Sparkles, TrendingDown } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";
import { ExecutiveFunnelStepDetails } from "./ExecutiveFunnelStepDetails";

interface ExecutiveFunnelStepCardProps {
	readonly stage: ExecutiveFunnelStageItem;
	readonly index: number;
	readonly totalStagesCount: number;
	readonly maxCount: number;
	readonly isSelected: boolean;
	readonly onSelect: (stage: ExecutiveFunnelStage) => void;
}

export function ExecutiveFunnelStepCard({
	stage,
	index,
	totalStagesCount,
	maxCount,
	isSelected,
	onSelect,
}: ExecutiveFunnelStepCardProps) {
	const barWidthPercent = Math.max(8, Math.min(100, Math.round((stage.count / maxCount) * 100)));

	return (
		<div
			className={`executive-funnel-step-card ${isSelected ? "active-step" : ""}`}
			onClick={() => onSelect(stage.stage)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(stage.stage);
				}
			}}
			tabIndex={0}
			role="button"
			aria-pressed={isSelected}
			aria-label={`${stage.stepNumber}. ${stage.title}: ${stage.count} пациентов, конверсия ${stage.conversionFromPreviousPercent}%`}
		>
			<div className="funnel-step-top">
				<div className="funnel-step-info">
					<span className="funnel-step-num">{stage.stepNumber}</span>
					<span className="funnel-step-title">{stage.title.replace(/\s*\(Diagnocat\)|Diagnocat\s*/gi, "")}</span>
					{stage.isAiAssisted && (
						<span className="funnel-ai-badge" title="Автоматический скрининг КЛКТ и прикусных снимков">
							<Sparkles size={13} aria-hidden="true" />
							ИИ-скрининг КЛКТ
						</span>
					)}
				</div>
				<div className="funnel-step-count">
					{stage.count.toLocaleString("ru-RU")}
					<span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--muted, #64748b)", marginLeft: "0.25rem" }}>
						пац.
					</span>
				</div>
			</div>

			<div className="funnel-step-progress-track" aria-hidden="true">
				<div
					className="funnel-step-progress-fill"
					style={{
						width: `${barWidthPercent}%`,
						background: index === 0 ? "var(--teal, #0d9488)" : index === totalStagesCount - 1 ? "var(--ok-fg, #10b981)" : undefined,
					}}
				/>
			</div>

			<div className="funnel-step-metrics">
				<div>
					{index === 0 ? (
						<span>Базовый пул: <strong>100%</strong></span>
					) : (
						<span>
							Конверсия этапа: <strong>{stage.conversionFromPreviousPercent}%</strong>
							<span style={{ color: "var(--muted, #64748b)", marginLeft: "0.5rem" }}>
								(сквозная: {stage.conversionFromLeadPercent}%)
							</span>
						</span>
					)}
				</div>

				{index > 0 && stage.dropOffCount > 0 && (
					<div className="funnel-step-dropoff" title={`Потери на данном этапе: ${stage.dropOffCount} пациентов`}>
						<TrendingDown size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} aria-hidden="true" />
						Отвал: -{stage.dropOffCount} ({stage.dropOffPercent}%)
					</div>
				)}

				{stage.totalVolumeKopecks > 0 && (
					<div className="funnel-step-cost" title="Финансовый объем этапа">
						Объем: <strong>{formatRublesClean(stage.totalVolumeFormatted)}</strong>
					</div>
				)}
			</div>

			{isSelected && <ExecutiveFunnelStepDetails stage={stage} />}
		</div>
	);
}
