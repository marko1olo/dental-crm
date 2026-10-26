/**
 * MischDensityCard.tsx — Карточка классификации плотности кости по Мишу (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { BoneDensityRecommendation } from "../panoramicMprMath";

export const MISCH_COLORS: Record<string, string> = {
	D1: "var(--red, #ef4444)",
	D2: "var(--teal, #0d9488)",
	D3: "var(--amber, #f59e0b)",
	D4: "var(--orange, #f97316)",
	D5: "var(--purple, #a855f7)",
};

interface MischDensityCardProps {
	activeClass: string;
	recommendation: BoneDensityRecommendation;
	meanHU: number;
}

export const MischDensityCard: React.FC<MischDensityCardProps> = ({
	activeClass,
	recommendation,
	meanHU,
}) => {
	const mischColor = MISCH_COLORS[activeClass] ?? "#a1a1aa";

	return (
		<div className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: "var(--glass-panel)" }}>
			<div
				style={{
					background: mischColor,
					color: "var(--on-teal, #fff)",
					fontWeight: 800,
					fontSize: "16px",
					padding: "4px 12px",
					borderRadius: "6px",
					letterSpacing: "1px",
					flexShrink: 0,
				}}
			>
				{activeClass}
			</div>
			<div className="text-xs leading-snug flex-1" style={{ color: "var(--ink)" }}>
				<div className="font-semibold">{recommendation.label}</div>
				<div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
					{recommendation.description}
				</div>
				<div className="text-[11px] font-medium mt-1" style={{ color: "var(--teal)" }}>
					Средняя плотность: {meanHU} HU ({recommendation.huRange})
				</div>
			</div>
		</div>
	);
};
