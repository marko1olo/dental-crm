import type React from "react";
import { Tooth46OcclusalCusps } from "./Tooth46OcclusalCusps";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "./Tooth46CariesSpectrumGeometry";

export interface Tooth46EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & 5 Occlusal Cusps for Tooth 46
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46EnamelCrown: React.FC<Tooth46EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH46_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH46_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth46-natural-crown-group"
			mask={destructive ? "url(#tooth46-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth46-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth46-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth46-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth46-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth46OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
