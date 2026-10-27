import React from "react";
import { Tooth15OcclusalCusps } from "./Tooth15OcclusalCusps";
import { TOOTH15_GEOMETRY } from "./tooth15GeometryConstants";

export interface Tooth15EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Occlusal Cusps for Upper Second Premolar Tooth 15.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth15EnamelCrown: React.FC<Tooth15EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH15_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH15_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth15-natural-crown-group">
			<path
				id="tooth15-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-15)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth15-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth15OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
