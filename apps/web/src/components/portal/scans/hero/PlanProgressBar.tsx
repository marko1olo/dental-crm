import React from "react";
import { formatRubles } from "../../patientCabinet/patientCabinetEngine.js";

export interface PlanProgressBarProps {
	readonly progressPercent: number;
	readonly totalCostRub: number;
}

export const PlanProgressBar: React.FC<PlanProgressBarProps> = ({
	progressPercent,
	totalCostRub,
}) => {
	const isComplete = progressPercent === 100;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
			<div className="pc-progress-bar-bg" style={{ height: "12px", borderRadius: "6px" }}>
				<div
					className="pc-progress-bar-fill"
					style={{
						width: `${progressPercent}%`,
						backgroundColor: isComplete ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)",
						transition: "width 0.5s ease",
					}}
				/>
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
				<span>0% (Старт)</span>
				<span>Итоговая стоимость плана: <strong>{formatRubles(totalCostRub)}</strong></span>
				<span>100% (Финал)</span>
			</div>
		</div>
	);
};
