import React from "react";
import { Tooth17OcclusalCusps } from "./Tooth17OcclusalCusps";
import { TOOTH17_GEOMETRY } from "./tooth17GeometryConstants";

export interface Tooth17EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Occlusal Cusps for Upper Second Molar Tooth 17.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth17EnamelCrown: React.FC<Tooth17EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH17_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH17_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth17-natural-crown-group">
			<path
				id="tooth17-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-17)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth17-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth17OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
