import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import { Tooth46OcclusalCusps } from "./Tooth46OcclusalCusps";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "../../Tooth46CariesSpectrumGeometry";

import type { CariesType } from "../../tooth46PresetTypes";

export interface Tooth46EnamelCrownProps {
	toothNumber?: number | undefined;
	stroke: string;
	crownOpacity: string;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
	cariesType?: CariesType | undefined;
}

/**
 * DENTE Dental CRM — Natural Enamel Monolith & 5 Occlusal Cusps for Tooth 46
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46EnamelCrown: React.FC<Tooth46EnamelCrownProps> = ({
	toothNumber,
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
	cariesType,
}) => {
	const tNum = useToothNumber(toothNumber) ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const crownPath = showAbfraction
		? TOOTH46_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH46_GEOMETRY.crownMonolithPath;

	const isMod = cariesType === "class2_mod";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isClass5 = cariesType === "class5";

	const cutout = isMod
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutoutMOD
		: isMO
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutoutMO
		: isDO
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutoutDO
		: isM
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutoutM
		: isD
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutoutD
		: isClass5
		? TOOTH46_CARIES_SPECTRUM_GEOMETRY.class5.destructiveCutout
		: TOOTH46_CARIES_SPECTRUM_GEOMETRY.destructiveCutout;

	const maskId = sid(`tooth${tNum}-crown-destruct-mask`);
	const clipId = sid(`tooth${tNum}-crown-clip`);

	return (
		<g
			id={sid(`tooth${tNum}-natural-crown-group`)}
			mask={destructive ? `url(#${maskId})` : undefined}
		>
			<defs>
				{destructive && (
					<mask id={maskId}>
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={cutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<path
				id={sid(`tooth${tNum}-crown-monolith`)}
				d={crownPath}
				fill={`url(#${sid("dente-enamel-porcelain")})`}
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath={`url(#${clipId})`}>
				<path
					d={crownPath}
					fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`}
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
