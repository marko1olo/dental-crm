import React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH47_GEOMETRY } from "./tooth47Geometry";
import { TOOTH47_CARIES_GEOMETRY } from "./tooth47CariesGeometry";
import { Tooth47OcclusalCusps } from "./Tooth47OcclusalCusps";

export interface Tooth47EnamelCrownProps {
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
	destructive = false,
	cariesType,
}) => {
	const crownPath = showAbfraction
		? TOOTH47_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH47_GEOMETRY.crownMonolithPath;

	const isMod = cariesType === "class2_mod";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isClass5 = cariesType === "class5";

	const cutout = isMod
		? TOOTH47_CARIES_GEOMETRY.destructiveCutoutMOD
		: isMO
		? TOOTH47_CARIES_GEOMETRY.destructiveCutoutMO
		: isDO
		? TOOTH47_CARIES_GEOMETRY.destructiveCutoutDO
		: isM
		? TOOTH47_CARIES_GEOMETRY.destructiveCutoutM
		: isD
		? TOOTH47_CARIES_GEOMETRY.destructiveCutoutD
		: isClass5
		? TOOTH47_CARIES_GEOMETRY.class5.destructiveCutout
		: TOOTH47_CARIES_GEOMETRY.destructiveCutout;

	return (
		<g
			id="tooth47-natural-crown-group"
			mask={destructive ? "url(#tooth47-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth47-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={cutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth47-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth47-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth47-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth47OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
