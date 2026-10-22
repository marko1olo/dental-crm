import React from "react";
import { ShieldCheck } from "lucide-react";
import type { ChamberPointEvaluation } from "../autoclaveLogEngine.js";

export interface NewCycleChamberPointsSectionProps {
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly onTogglePoint: (pointIndex: 1 | 2 | 3 | 4 | 5) => void;
	readonly onSetAllPointsStatus: (passed: boolean) => void;
}

export const NewCycleChamberPointsSection: React.FC<NewCycleChamberPointsSectionProps> = ({
	chamberPoints, onTogglePoint, onSetAllPointsStatus,
}) => (
	<div className="chamber-matrix-wrapper">
		<div className="chamber-matrix-header">
			<div>
				<span className="autoclave-form-label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
					<ShieldCheck size={16} color="var(--teal, #0d9488)" /> Контроль термоиндикаторов в 5 точках камеры
				</span>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
					Кликните на маркер точки для смены статуса (ОК / Брак)
				</div>
			</div>
			<div style={{ display: "flex", gap: "0.5rem" }}>
				<button type="button" onClick={() => onSetAllPointsStatus(true)} className="autoclave-btn autoclave-btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", minHeight: "44px" }}>
					Все 5 точек СТЕРИЛЬНО
				</button>
				<button type="button" onClick={() => onSetAllPointsStatus(false)} className="autoclave-btn autoclave-btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", minHeight: "44px", color: "#dc2626" }}>
					Сброс (Брак)
				</button>
			</div>
		</div>
		<div className="chamber-points-list-grid">
			{chamberPoints.map((pt) => {
				const isPassed = pt.status === "passed";
				return (
					<button
						key={pt.pointIndex} type="button" onClick={() => onTogglePoint(pt.pointIndex as 1 | 2 | 3 | 4 | 5)}
						className="chamber-point-card"
						style={{
							cursor: "pointer", textAlign: "left",
							borderColor: isPassed ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
							background: isPassed ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<strong>{pt.code}</strong>
							<span className={`status-badge ${isPassed ? "passed" : "failed"}`}>{isPassed ? "ОК" : "БРАК"}</span>
						</div>
						<div style={{ color: "var(--muted, #64748b)", fontSize: "0.6875rem" }}>{pt.nameRu}</div>
						<div style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Цвет: {pt.actualColorRu}</div>
					</button>
				);
			})}
		</div>
	</div>
);
