import React from "react";
import { Tooth13OcclusalCusps } from "./Tooth13OcclusalCusps";
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";

export interface Tooth13EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Labial Ridge for Upper Canine 13.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13EnamelCrown: React.FC<Tooth13EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH13_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH13_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth13-natural-crown-group">
			<path
				id="tooth13-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain-13)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume & Cervical Ridge */}
			<g clipPath="url(#tooth13-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-cervical-ridge-13-dark)" : "url(#dente-cervical-ridge-13)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth13OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
