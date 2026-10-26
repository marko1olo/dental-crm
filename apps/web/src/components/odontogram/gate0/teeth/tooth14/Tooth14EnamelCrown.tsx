import type React from "react";
import type { CariesType } from "../../tooth46PresetTypes";
import { TOOTH14_GEOMETRY } from "./tooth14Geometry";

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
 * Anatomical Enamel Monolith & Wheeler Ch. 10 Cusps for Maxillary First Premolar 14
 * Features sharp buccal cusp, softer palatal cusp, and mesial marginal groove.
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
	const g = TOOTH14_GEOMETRY;
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
		<g id="tooth14-natural-crown-group">
			<clipPath id="tooth14-crown-clip">
				<path d={crownPath} />
			</clipPath>

			{/* Enamel Monolith */}
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

			{/* Proximal Volume Gradient */}
			<g clipPath="url(#tooth14-crown-clip)">
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
						d={g.buccalAxialRidge}
						fill="none"
						stroke={ridgeStroke}
						strokeWidth="0.9"
						strokeLinecap="round"
						opacity="0.6"
					/>
				)}

				{/* Occlusal Fissures: Central Sulcus & Mesial Marginal Groove */}
				{showFissures && (
					<g id="tooth14-fissure-system">
						<path d={g.sulcusCentralis} fill="none" stroke={fissureStroke} strokeWidth="0.75" strokeLinecap="round" />
						<path d={g.mesialMarginalGroove} fill="none" stroke={fissureStroke} strokeWidth="0.65" strokeLinecap="round" />
						<path d={g.buccalTriangularGroove} fill="none" stroke={fissureStroke} strokeWidth="0.55" strokeLinecap="round" />
						<path d={g.distalTriangularGroove} fill="none" stroke={fissureStroke} strokeWidth="0.55" strokeLinecap="round" />
						<path d={g.distalFossaGroove} fill="none" stroke={fissureStroke} strokeWidth="0.5" strokeLinecap="round" />
					</g>
				)}

				{/* Cusp Specular Highlights */}
				{showCusps && (
					<g id="tooth14-cusp-highlights">
						<path d={g.crownSpecularRidges[0]!.d} fill="none" stroke={ridgeStroke} strokeWidth="0.7" strokeLinecap="round" />
						<path d={g.crownEquatorHighlight} fill="none" stroke={ridgeStroke} strokeWidth="0.5" strokeLinecap="round" opacity="0.3" />
					</g>
				)}
			</g>

			{/* Destructive Caries Notch if active */}
			{destructive && (
				<path
					d="M 40,146 C 45,142 50,142 55,145 L 53,151 L 42,151 Z"
					fill="#0c0a09"
					stroke="#991b1b"
					strokeWidth="0.8"
				/>
			)}
		</g>
	);
};
