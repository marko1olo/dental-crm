import React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH48_GEOMETRY } from "./tooth48Geometry";
import { TOOTH48_CARIES_GEOMETRY } from "./tooth48CariesGeometry";
import { Tooth48OcclusalCusps } from "./Tooth48OcclusalCusps";

export interface Tooth48EnamelCrownProps {
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
 * DENTE Dental CRM — Natural Enamel Monolith & 4 Occlusal Cusps for Tooth 48
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth48EnamelCrown: React.FC<Tooth48EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
	cariesType,
}) => {
	const crownPath = showAbfraction
		? TOOTH48_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH48_GEOMETRY.crownMonolithPath;

	const isMod = cariesType === "class2_mod";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isClass5 = cariesType === "class5";

	const cutout = isMod
		? TOOTH48_CARIES_GEOMETRY.destructiveCutoutMOD
		: isMO
		? TOOTH48_CARIES_GEOMETRY.destructiveCutoutMO
		: isDO
		? TOOTH48_CARIES_GEOMETRY.destructiveCutoutDO
		: isM
		? TOOTH48_CARIES_GEOMETRY.destructiveCutoutM
		: isD
		? TOOTH48_CARIES_GEOMETRY.destructiveCutoutD
		: isClass5
		? TOOTH48_CARIES_GEOMETRY.class5.destructiveCutout
		: TOOTH48_CARIES_GEOMETRY.destructiveCutout;

	return (
		<g
			id="tooth48-natural-crown-group"
			mask={destructive ? "url(#tooth48-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth48-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={cutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth48-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth48-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth48-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth48OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
