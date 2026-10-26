import type React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";

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
 * Anatomical Enamel Monolith & Wheeler Ch. 10 Cusps for Maxillary Second Premolar 15
 * Features equal-height cusps, rounded contour, and supplemental occlusal grooves.
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
	const g = TOOTH15_GEOMETRY;
	const crownPath = showAbfraction
		? g.crownMonolithPathWithAbfraction
		: g.crownMonolithPath;

	const fissureStroke = isDark
		? "rgba(100, 116, 139, 0.70)"
		: "rgba(71, 85, 105, 0.65)";
	const ridgeStroke = isDark
		? "rgba(255, 255, 255, 0.40)"
		: "rgba(255, 255, 255, 0.65)";

	return (
		<g id="tooth15-natural-crown-group">
			<clipPath id="tooth15-crown-clip">
				<path d={crownPath} />
			</clipPath>

			{/* Enamel Monolith */}
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

			{/* Proximal Volume Gradient */}
			<g clipPath="url(#tooth15-crown-clip)">
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>

				{/* Buccal Cervical Convexity Ridge */}
				<path
					d={g.buccalCervicalRidge}
					fill="none"
					stroke={ridgeStroke}
					strokeWidth="0.7"
					opacity="0.5"
				/>

				{/* Buccal Axial Ridge Highlight */}
				{showCusps && (
					<path
						d={g.crownSpecularRidges[1]!.d}
						fill="none"
						stroke={ridgeStroke}
						strokeWidth="0.85"
						strokeLinecap="round"
						opacity="0.6"
					/>
				)}

				{/* Occlusal Fissures: Central Sulcus & Supplemental Wrinkles */}
				{showFissures && (
					<g id="tooth15-fissure-system">
						<path d={g.sulcusCentralis} fill="none" stroke={fissureStroke} strokeWidth="0.75" strokeLinecap="round" />
						{g.supplementalGrooves.map((sg) => (
							<path key={sg.id} d={sg.d} fill="none" stroke={fissureStroke} strokeWidth="0.55" strokeLinecap="round" />
						))}
					</g>
				)}

				{/* Cusp Specular Highlights */}
				{showCusps && (
					<g id="tooth15-cusp-highlights">
						<path d={g.crownSpecularRidges[0]!.d} fill="none" stroke={ridgeStroke} strokeWidth="0.7" strokeLinecap="round" />
						<path d={g.crownEquatorHighlight} fill="none" stroke={ridgeStroke} strokeWidth="0.5" strokeLinecap="round" opacity="0.3" />
					</g>
				)}
			</g>

			{/* Destructive Caries Notch if active */}
			{destructive && (
				<path
					d="M 42,145 C 47,141 53,141 58,145 L 56,150 L 44,150 Z"
					fill="#0c0a09"
					stroke="#991b1b"
					strokeWidth="0.8"
				/>
			)}
		</g>
	);
};
