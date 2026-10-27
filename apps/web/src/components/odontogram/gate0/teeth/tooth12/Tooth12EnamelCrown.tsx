import React from "react";
import { Tooth12OcclusalCusps } from "./Tooth12OcclusalCusps";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export interface Tooth12EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Incisal Edge for Upper Lateral Incisor 12.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12EnamelCrown: React.FC<Tooth12EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH12_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH12_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth12-natural-crown-group">
			<path
				id="tooth12-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-12)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume & Cervical Ridge */}
			<g clipPath="url(#tooth12-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-cervical-ridge-12-dark)" : "url(#dente-cervical-ridge-12)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth12OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
