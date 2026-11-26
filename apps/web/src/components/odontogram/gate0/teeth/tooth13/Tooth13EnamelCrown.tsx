import React from "react";
import { Tooth13OcclusalCusps } from "./Tooth13OcclusalCusps";
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth13EnamelCrownProps {
	stroke: string;
	crownOpacity?: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Natural Enamel Monolith & Labial Ridge for Upper Canine 13.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13EnamelCrown: React.FC<Tooth13EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
}) => {
	const tNum = useToothNumber() ?? 13;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const crownPath = showAbfraction
		? TOOTH13_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH13_GEOMETRY.crownMonolithPath;

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
			<Tooth13OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
