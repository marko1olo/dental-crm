import React from "react";
import { TOOTH47_GEOMETRY } from "./tooth47Geometry";
import { Tooth47OcclusalCusps } from "./Tooth47OcclusalCusps";

export interface Tooth47EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & 4 Occlusal Cusps for Tooth 47
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth47EnamelCrown: React.FC<Tooth47EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => (
	<g id="tooth47-natural-crown-group">
		<clipPath id="tooth47-crown-clip">
			<path
				d={
					showAbfraction
						? TOOTH47_GEOMETRY.crownMonolithPathWithAbfraction
						: TOOTH47_GEOMETRY.crownMonolithPath
				}
			/>
		</clipPath>
		<path
			id="tooth47-crown-monolith"
			d={
				showAbfraction
					? TOOTH47_GEOMETRY.crownMonolithPathWithAbfraction
					: TOOTH47_GEOMETRY.crownMonolithPath
			}
			fill="url(#dente-enamel-porcelain)"
			fillOpacity={crownOpacity}
			stroke={stroke}
			strokeWidth="0.8"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
		<Tooth47OcclusalCusps
			showCusps={showCusps}
			showFissures={showFissures}
			renderBaseCrown={false}
			isDark={isDark}
		/>
	</g>
);
