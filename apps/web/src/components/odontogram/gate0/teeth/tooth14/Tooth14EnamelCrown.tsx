import type React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH14_GEOMETRY } from "./tooth14Geometry";
import { Tooth14OcclusalCusps } from "./Tooth14OcclusalCusps";

export interface Tooth14EnamelCrownProps {
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
 * Natural Enamel Monolith & 3D Cusps for Maxillary First Premolar 14
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth14EnamelCrown: React.FC<Tooth14EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH14_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH14_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth14-natural-crown-group"
			mask={destructive ? "url(#tooth14-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth14-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path
							d="M 36,116 C 44,118 56,118 64,116 C 62,123 56,126 50,126 C 44,126 38,123 36,116 Z"
							fill="#000000"
						/>
					</mask>
				)}
			</defs>
			<clipPath id="tooth14-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth14-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth14-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth14OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
