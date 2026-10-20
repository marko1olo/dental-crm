import type React from "react";
import { Tooth46OcclusalCusps } from "./Tooth46OcclusalCusps";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";

export interface Tooth46EnamelCrownProps {
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean;
	showFissures?: boolean;
	isDark?: boolean;
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
	isDark = false,
}) => (
	<g id="tooth46-natural-crown-group">
		<path
			id="tooth46-crown-monolith"
			d={TOOTH46_GEOMETRY.crownMonolithPath}
			fill="url(#dente-enamel-porcelain)"
			fillOpacity={crownOpacity}
			stroke={stroke}
			strokeWidth="0.8"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
		/>
		<Tooth46OcclusalCusps
			showCusps={showCusps}
			showFissures={showFissures}
			renderBaseCrown={false}
			isDark={isDark}
		/>
	</g>
);
