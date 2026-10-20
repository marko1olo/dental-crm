import type React from "react";
import type { LowerIncisorWearOverlayProps } from "./overlayTypes";

/**
 * Mandibular Incisor Pathological Incisal Attrition Overlay
 * Degree I: Enamel flattening.
 * Degree II: Amber dentin islands.
 * Degree III: Severe attrition down to secondary dentin near pulp chamber.
 * Mandate 8b <= 120 lines.
 */
export const LowerIncisorWearOverlay: React.FC<
	LowerIncisorWearOverlayProps
> = ({ degree = 0, toothNumber = 31, isDark = false, className }) => {
	if (degree === 0) return null;

	const isLateral = toothNumber === 32 || toothNumber === 42;
	const xStart = isLateral ? 30 : 33;
	const xEnd = isLateral ? 70 : 67;
	const yBase = isLateral ? 17.5 : 16.5;

	return (
		<g
			id={`tooth-${toothNumber}-wear-overlay`}
			data-wear-degree={degree}
			className={className}
		>
			{/* Degree I: Enamel Flattening Wear Facet */}
			{degree >= 1 && (
				<path
					id="wear-facet-enamel"
					d={`M ${xStart},${yBase} L ${xEnd},${isLateral ? yBase + 1.5 : yBase} L ${xEnd - 1},${yBase + 2.5} L ${xStart + 1},${yBase + 2} Z`}
					fill={isDark ? "rgba(226, 232, 240, 0.70)" : "rgba(241, 245, 249, 0.85)"}
					stroke="rgba(255, 255, 255, 0.90)"
					strokeWidth="0.5"
				/>
			)}

			{/* Degree II: Amber Dentin Islands Exposed on Incisal Edge */}
			{degree >= 2 && (
				<g id="wear-dentin-islands">
					<ellipse
						id="dentin-island-mesial"
						cx={isLateral ? 41 : 42}
						cy={yBase + 1}
						rx="3.5"
						ry="1.2"
						fill="#d97706"
						stroke="#b45309"
						strokeWidth="0.5"
					/>
					<ellipse
						id="dentin-island-distal"
						cx={isLateral ? 59 : 58}
						cy={isLateral ? yBase + 1.8 : yBase + 1}
						rx="3.5"
						ry="1.2"
						fill="#d97706"
						stroke="#b45309"
						strokeWidth="0.5"
					/>
				</g>
			)}

			{/* Degree III: Deep Attrition Crater & Secondary Dentin near Pulp Chamber */}
			{degree >= 3 && (
				<g id="wear-secondary-dentin-crater">
					{/* Deep sclerotic secondary dentin trough */}
					<path
						id="dentin-crater-sclerotic"
						d={`M ${xStart + 2},${yBase} Q 50,${yBase + 6} ${xEnd - 2},${isLateral ? yBase + 1.5 : yBase} Q 50,${yBase + 8} ${xStart + 2},${yBase} Z`}
						fill="#92400e"
						stroke="#78350f"
						strokeWidth="0.6"
					/>
					{/* Pulp chamber proximity glow */}
					<ellipse
						id="pulp-proximity-glow"
						cx="50"
						cy={yBase + 5.5}
						rx="5"
						ry="2"
						fill="rgba(220, 38, 38, 0.45)"
						stroke="rgba(185, 28, 28, 0.60)"
						strokeWidth="0.4"
					/>
				</g>
			)}
		</g>
	);
};
