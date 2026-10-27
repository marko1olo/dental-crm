import React from "react";
import { Tooth18OcclusalCusps } from "./Tooth18OcclusalCusps";
import { TOOTH18_GEOMETRY } from "./tooth18GeometryConstants";

export interface Tooth18EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Occlusal Cusps for Upper Third Molar Tooth 18.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18EnamelCrown: React.FC<Tooth18EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH18_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH18_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth18-natural-crown-group">
			<path
				id="tooth18-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-18)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth18-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth18OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
