import React from "react";
import { Tooth18OcclusalCusps } from "./Tooth18OcclusalCusps";
import { TOOTH18_GEOMETRY } from "./tooth18GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth18EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Occlusal Cusps for Upper Third Molar Tooth 18.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18EnamelCrown: React.FC<Tooth18EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const tNum = useToothNumber() ?? 18;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const crownPath = showAbfraction
		? TOOTH18_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH18_GEOMETRY.crownMonolithPath;

	return (
		<g id={sid(`tooth${tNum}-natural-crown-group`)}>
			<path
				id={sid(`tooth${tNum}-crown-monolith`)}
				d={crownPath}
				fill={`url(#${sid(`dente-enamel-porcelain-${tNum}`)})`}
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
				<path
					d={crownPath}
					fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth18OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
