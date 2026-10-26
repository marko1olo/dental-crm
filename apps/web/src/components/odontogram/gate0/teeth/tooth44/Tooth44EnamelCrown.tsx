import type React from "react";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";
import { TOOTH44_CARIES_GEOMETRY } from "./tooth44CariesGeometry";
import { Tooth44OcclusalCusps } from "./Tooth44OcclusalCusps";

export interface Tooth44EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & Asymmetric Cusps for Tooth 44
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth44EnamelCrown: React.FC<Tooth44EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH44_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH44_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth44-natural-crown-group"
			mask={destructive ? "url(#tooth44-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth44-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={TOOTH44_CARIES_GEOMETRY.destructiveCutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth44-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth44-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth44-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth44OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
