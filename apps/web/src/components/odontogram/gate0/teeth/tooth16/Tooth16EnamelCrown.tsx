import React from "react";
import { Tooth16OcclusalCusps } from "./Tooth16OcclusalCusps";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & 5 Occlusal Cusps for Upper Molar Tooth 16.
 * Stage 1: Inverted base with top-left incident illumination.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth16EnamelCrown: React.FC<Tooth16EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH16_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH16_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth16-natural-crown-group">
			<path
				id="tooth16-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-16)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth16-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth16OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
