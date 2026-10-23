import type React from "react";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";
import { Tooth44OcclusalCusps } from "./Tooth44OcclusalCusps";

export interface Tooth44EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
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
}) => (
	<g id="tooth44-natural-crown-group">
		<clipPath id="tooth44-crown-clip">
			<path
				d={
					showAbfraction
						? TOOTH44_GEOMETRY.crownMonolithPathWithAbfraction
						: TOOTH44_GEOMETRY.crownMonolithPath
				}
			/>
		</clipPath>
		<path
			id="tooth44-crown-monolith"
			d={
				showAbfraction
					? TOOTH44_GEOMETRY.crownMonolithPathWithAbfraction
					: TOOTH44_GEOMETRY.crownMonolithPath
			}
			fill="url(#dente-enamel-porcelain)"
			fillOpacity={crownOpacity}
			stroke={stroke}
			strokeWidth="0.8"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
		<Tooth44OcclusalCusps
			showCusps={showCusps}
			showFissures={showFissures}
			renderBaseCrown={false}
			isDark={isDark}
		/>
	</g>
);
