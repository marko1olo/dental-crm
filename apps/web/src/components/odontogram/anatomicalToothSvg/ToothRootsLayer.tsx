/**
 * DENTE Dental CRM — Anatomical Tooth Roots & Resorption Layer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { PhysiologicalResorptionGeometry } from "../anatomicalGeometriesTypes";
import type { ToothVisualProps } from "../ToothChart";

export interface ToothRootsLayerProps {
	effectiveRootPath: string;
	resorptionGeom: PhysiologicalResorptionGeometry;
	colors: ToothVisualProps;
	isLowSpec: boolean;
	hasApicoectomy?: boolean | undefined;
	isTop: boolean;
}

export const ToothRootsLayer: React.FC<ToothRootsLayerProps> = ({
	effectiveRootPath,
	resorptionGeom,
	colors,
	isLowSpec,
	hasApicoectomy,
	isTop,
}) => {
	if (!effectiveRootPath) return null;

	return (
		<g className="tooth-roots-group" opacity={resorptionGeom.opacity}>
			<path
				d={effectiveRootPath}
				fill={colors.rootFill}
				stroke={colors.stroke}
				strokeWidth={isLowSpec ? "1.6" : "1.8"}
				strokeLinejoin="round"
				className="tooth-root-path transition-colors duration-200"
			/>
			{resorptionGeom.isResorbed && resorptionGeom.resorptionHatchAreaPath && (
				<path
					d={resorptionGeom.resorptionHatchAreaPath}
					fill="url(#dente-resorption-hatch)"
					stroke="none"
					opacity={0.8}
				/>
			)}
			{resorptionGeom.isResorbed && resorptionGeom.resorptionLinePath && (
				<path
					d={resorptionGeom.resorptionLinePath}
					fill="none"
					stroke="#e11d48"
					strokeWidth="1.8"
					strokeDasharray="3 2"
					strokeLinecap="round"
				/>
			)}
			{hasApicoectomy && (
				<line
					x1="20"
					y1={isTop ? "18" : "142"}
					x2="80"
					y2={isTop ? "18" : "142"}
					stroke="#dc2626"
					strokeWidth="2.5"
					strokeDasharray="4 2"
					strokeLinecap="round"
				/>
			)}
		</g>
	);
};
