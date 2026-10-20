import type React from "react";
import type { IncisorWearDegree } from "../types/upperIncisorTypes";

export interface UpperIncisorWearOverlayProps {
	degree: IncisorWearDegree;
	degree1Path: string;
	degree2Path: string;
	degree3Path: string;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Incisor Attrition & Wear Facets Overlay
 * Degrees I–III: enamel wear to deep cup-shaped secondary amber dentin.
 * Mandate 8b <= 120 lines.
 */
export const UpperIncisorWearOverlay: React.FC<UpperIncisorWearOverlayProps> = ({
	degree,
	degree1Path,
	degree2Path,
	degree3Path,
	isDark = false,
	className,
}) => {
	if (degree === 0) return null;

	return (
		<g
			id="upper-incisor-wear-overlay"
			data-wear-degree={degree}
			className={className}
		>
			{degree === 1 && (
				<path
					id="wear-facet-degree-1"
					d={degree1Path}
					fill={isDark ? "rgba(226, 232, 240, 0.75)" : "rgba(255, 255, 255, 0.85)"}
					stroke="rgba(148, 163, 184, 0.60)"
					strokeWidth="0.5"
				/>
			)}
			{degree === 2 && (
				<g id="wear-facet-degree-2-group">
					<path
						id="wear-facet-degree-2"
						d={degree2Path}
						fill="#d97706"
						stroke="#b45309"
						strokeWidth="0.6"
					/>
					<path
						d={degree2Path}
						fill="none"
						stroke="rgba(254, 243, 199, 0.50)"
						strokeWidth="0.3"
					/>
				</g>
			)}
			{degree === 3 && (
				<g id="wear-facet-degree-3-group">
					<path
						id="wear-facet-degree-3"
						d={degree3Path}
						fill="#92400e"
						stroke="#78350f"
						strokeWidth="0.7"
					/>
					<ellipse
						cx="50"
						cy="139"
						rx="18"
						ry="2.5"
						fill="#b45309"
						opacity="0.80"
					/>
				</g>
			)}
		</g>
	);
};
