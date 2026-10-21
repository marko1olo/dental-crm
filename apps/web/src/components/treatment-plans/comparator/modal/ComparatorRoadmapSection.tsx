import React from "react";
import { Clock } from "lucide-react";
import type { ComprehensivePlanVariant } from "../planPresentationPresets";

export interface ComparatorRoadmapSectionProps {
	currentVariant: ComprehensivePlanVariant;
}

export const ComparatorRoadmapSection: React.FC<ComparatorRoadmapSectionProps> = ({ currentVariant }) => {
	return (
		<section className="plan-roadmap-section">
			<h4 className="plan-roadmap-title">
				<Clock size={16} style={{ color: "var(--plan-primary)" }} />
				<span>Клинический маршрут лечения: {currentVariant.title} ({currentVariant.totalDurationWeeks} недель)</span>
			</h4>

			<div className="plan-roadmap-stages">
				{currentVariant.stages.map((stage) => (
					<div key={stage.stageIndex} className="plan-stage-step">
						<div className="plan-stage-header">
							<span className="plan-stage-num">Этап {stage.stageIndex}</span>
							<span className="plan-stage-cost">{stage.costRub.toLocaleString("ru-RU")} ₽</span>
						</div>

						<div>
							<strong style={{ fontSize: "0.8125rem" }}>{stage.title}</strong>
							<p style={{ fontSize: "0.6875rem", color: "var(--plan-text-muted)", margin: "2px 0 0 0" }}>
								{stage.subtitle} &bull; {stage.visitsCount} визита (~{stage.durationWeeks} нед.)
							</p>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "2px", overflowY: "auto", maxHeight: "110px", minWidth: 0 }}>
							{stage.keyProcedures.map((proc, pIdx) => (
								<span key={pIdx} className="plan-proc-tag" title={proc}>
									&bull; {proc}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	);
};
