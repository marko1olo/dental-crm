import React from "react";
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
}) => {
	const crownPath = showAbfraction
		? TOOTH47_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH47_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth47-natural-crown-group"
			mask={destructive ? "url(#tooth47-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth47-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={TOOTH47_CARIES_GEOMETRY.destructiveCutout} fill="#000000" />
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
