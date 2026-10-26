import React from "react";
import type { ThreeTierOption } from "../../patientCabinet/patientCabinetEngine.js";

export interface PlanThreeTierBenefitsProps {
	readonly curTier?: ThreeTierOption | undefined;
}

export const PlanThreeTierBenefits: React.FC<PlanThreeTierBenefitsProps> = ({ curTier }) => {
	if (!curTier) return null;

	return (
		<div
			style={{
				backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
				border: "1px solid var(--pc-border, #334155)",
				borderRadius: "8px",
				padding: "10px 14px",
				fontSize: "12px",
			}}
		>
			<strong
				style={{
					color: "var(--pc-primary, #0d9488)",
					display: "block",
					marginBottom: "4px",
				}}
			>
				Ключевые преимущества плана ({curTier.tierNameRu}):
			</strong>
			<ul
				style={{
					margin: 0,
					paddingLeft: "18px",
					color: "var(--pc-text-main, var(--ink, #0f172a))",
					display: "flex",
					flexDirection: "column",
					gap: "3px",
				}}
			>
				{curTier.benefits.map((b, bIdx) => (
					<li key={bIdx}>{b}</li>
				))}
			</ul>
		</div>
	);
};
