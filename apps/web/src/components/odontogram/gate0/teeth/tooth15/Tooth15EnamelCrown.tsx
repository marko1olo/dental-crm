import type React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";
import { Tooth15OcclusalCusps } from "./Tooth15OcclusalCusps";

export interface Tooth15EnamelCrownProps {
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
 * Natural Enamel Monolith & Balanced 3D Cusps for Maxillary Second Premolar 15
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth15EnamelCrown: React.FC<Tooth15EnamelCrownProps> = ({
	stroke,
	crownOpacity,
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const crownPath = showAbfraction
		? TOOTH15_GEOMETRY.crownMonolithPathWithAbfraction
		: TOOTH15_GEOMETRY.crownMonolithPath;

	return (
		<g
			id="tooth15-natural-crown-group"
			mask={destructive ? "url(#tooth15-crown-destruct-mask)" : undefined}
		>
			<defs>
				{destructive && (
					<mask id="tooth15-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path
							d="M 36,116 C 44,118 56,118 64,116 C 62,123 56,126 50,126 C 44,126 38,123 36,116 Z"
							fill="#000000"
						/>
					</mask>
				)}
			</defs>
			<clipPath id="tooth15-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth15-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Unified 3D Cylindrical Proximal Contour Volume */}
			<g clipPath="url(#tooth15-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth15OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				renderBaseCrown={false}
				isDark={isDark}
			/>
		</g>
	);
};
