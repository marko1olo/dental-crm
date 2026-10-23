import type React from "react";
import { TOOTH45_GEOMETRY } from "./tooth45Geometry";
import { Tooth45OcclusalCusps } from "./Tooth45OcclusalCusps";

export interface Tooth45EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
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
}) => (
	<g id="tooth45-natural-crown-group">
		<clipPath id="tooth45-crown-clip">
			<path
				d={
					showAbfraction
						? TOOTH45_GEOMETRY.crownMonolithPathWithAbfraction
						: TOOTH45_GEOMETRY.crownMonolithPath
				}
			/>
		</clipPath>
		<path
			id="tooth45-crown-monolith"
			d={
				showAbfraction
					? TOOTH45_GEOMETRY.crownMonolithPathWithAbfraction
					: TOOTH45_GEOMETRY.crownMonolithPath
			}
			fill="url(#dente-enamel-porcelain)"
			fillOpacity={crownOpacity}
			stroke={stroke}
			strokeWidth="0.8"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
		<Tooth45OcclusalCusps
			showCusps={showCusps}
			showFissures={showFissures}
			renderBaseCrown={false}
			isDark={isDark}
		/>
	</g>
);
