import type React from "react";
import { TOOTH45_GEOMETRY } from "./tooth45Geometry";
import { TOOTH45_CARIES_GEOMETRY } from "./tooth45CariesGeometry";
import { Tooth45OcclusalCusps } from "./Tooth45OcclusalCusps";

export interface Tooth45EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & 3 Occlusal Cusps for Tooth 45
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth45EnamelCrown: React.FC<Tooth45EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH45_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH45_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth45-natural-crown-group"
			mask={destructive ? "url(#tooth45-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth45-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={TOOTH45_CARIES_GEOMETRY.destructiveCutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth45-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth45-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth45-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth45OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
