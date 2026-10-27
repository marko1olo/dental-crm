import React from "react";
import { Tooth11OcclusalCusps } from "./Tooth11OcclusalCusps";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Incisal Edge for Upper Central Incisor 11.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11EnamelCrown: React.FC<Tooth11EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH11_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH11_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth11-natural-crown-group">
			<path
				id="tooth11-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-11)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume & Cervical Ridge */}
			<g clipPath="url(#tooth11-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-cervical-ridge-11-dark)" : "url(#dente-cervical-ridge-11)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth11OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
