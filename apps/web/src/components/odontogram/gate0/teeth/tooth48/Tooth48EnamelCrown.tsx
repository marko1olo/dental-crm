import type React from "react";
import { TOOTH48_GEOMETRY } from "./tooth48Geometry";
import { Tooth48OcclusalCusps } from "./Tooth48OcclusalCusps";

export interface Tooth48EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & 4 Occlusal Cusps for Tooth 48
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth48EnamelCrown: React.FC<Tooth48EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH48_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH48_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth48-natural-crown-group">
			<clipPath id="tooth48-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth48-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth48-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth48OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
