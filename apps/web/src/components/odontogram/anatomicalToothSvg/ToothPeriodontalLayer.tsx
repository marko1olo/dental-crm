/**
 * DENTE Dental CRM — Anatomical Tooth Periodontal Bone & Furcation Layer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { FurcationGrade, FurcationSite } from "../anatomicalGeometriesTypes";
import { getFurcationMarkerSvg } from "../anatomicalMaterialsAndSurfaces";

export interface ToothPeriodontalLayerProps {
	boneLine: string;
	resorptionArea: string;
	gingivalRecessionPath: string;
	furcationSites: readonly FurcationSite[];
	effectiveFurcation: FurcationGrade;
	isTop: boolean;
	bopSites?: string[] | undefined;
	suppurationSites?: string[] | undefined;
}

export const ToothPeriodontalLayer: React.FC<ToothPeriodontalLayerProps> = ({
	boneLine,
	resorptionArea,
	gingivalRecessionPath,
	furcationSites,
	effectiveFurcation,
	isTop,
	bopSites,
	suppurationSites,
}) => {
	const hasBop = Boolean(bopSites && bopSites.length > 0);
	const hasSuppuration = Boolean(suppurationSites && suppurationSites.length > 0);

	return (
		<g className="tooth-periodontal-group pointer-events-none">
			{resorptionArea && (
				<path d={resorptionArea} fill="url(#dente-bone-resorption-hatch)" opacity={0.6} />
			)}
			{boneLine && (
				<path d={boneLine} fill="none" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="3 2" />
			)}
			{gingivalRecessionPath && (
				<path d={gingivalRecessionPath} fill="none" stroke="#f43f5e" strokeWidth="1.5" />
			)}
			{effectiveFurcation > 0 &&
				furcationSites.map((site) => {
					const marker = getFurcationMarkerSvg(effectiveFurcation, site.position.x, site.position.y, isTop);
					if (!marker) return null;
					return (
						<path
							key={site.id}
							d={marker.path}
							fill={marker.fill}
							stroke={marker.stroke}
							strokeWidth={marker.strokeWidth}
						/>
					);
				})}
			{hasBop && (
				<circle cx={isTop ? 22 : 22} cy={isTop ? 94 : 66} r="3" fill="#ef4444" className="animate-pulse" />
			)}
			{hasSuppuration && (
				<circle cx={isTop ? 78 : 78} cy={isTop ? 94 : 66} r="3" fill="#eab308" className="animate-pulse" />
			)}
		</g>
	);
};
