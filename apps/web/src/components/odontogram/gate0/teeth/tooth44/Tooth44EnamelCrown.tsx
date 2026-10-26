import type React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";
import { TOOTH44_CARIES_GEOMETRY } from "./tooth44CariesGeometry";
import { Tooth44OcclusalCusps } from "./Tooth44OcclusalCusps";

export interface Tooth44EnamelCrownProps {
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
	destructive = false,
	cariesType,
}) => {
	const crownPath = showAbfraction
		? TOOTH44_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH44_GEOMETRY.crownMonolithPath;

	const isMod = cariesType === "class2_mod";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isClass5 = cariesType === "class5";

	const cutout = isMod
		? TOOTH44_CARIES_GEOMETRY.destructiveCutoutMOD
		: isMO
		? TOOTH44_CARIES_GEOMETRY.destructiveCutoutMO
		: isDO
		? TOOTH44_CARIES_GEOMETRY.destructiveCutoutDO
		: isM
		? TOOTH44_CARIES_GEOMETRY.destructiveCutoutM
		: isD
		? TOOTH44_CARIES_GEOMETRY.destructiveCutoutD
		: isClass5
		? TOOTH44_CARIES_GEOMETRY.class5.destructiveCutout
		: TOOTH44_CARIES_GEOMETRY.destructiveCutout;

	return (
		<g
			id="tooth44-natural-crown-group"
			mask={destructive ? "url(#tooth44-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth44-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={cutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth44-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth44-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth44-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth44OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
