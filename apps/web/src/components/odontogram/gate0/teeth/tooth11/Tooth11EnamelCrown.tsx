import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import { Tooth11OcclusalCusps } from "./Tooth11OcclusalCusps";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Incisal Edge for Upper Central Incisor 11.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11EnamelCrown: React.FC<Tooth11EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const tNum = useToothNumber() ?? 11;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const crownPath = showAbfraction
		? TOOTH11_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH11_GEOMETRY.crownMonolithPath;

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
			{/* Unified 3D Cylindrical Proximal Contour Volume & Cervical Ridge */}
			<g clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`}>
				<path
					d={crownPath}
					fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={crownPath}
					fill={`url(#${sid(isDark ? `dente-cervical-ridge-${tNum}-dark` : `dente-cervical-ridge-${tNum}`)})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth11OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
