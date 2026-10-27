import type React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH15_CUSPS } from "./tooth15CuspGeometry";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";

export interface Tooth15OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical 3D Cusp Slopes, Lobes & Wrinkled Fissures for Maxillary Second Premolar 15
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth15OcclusalCusps: React.FC<Tooth15OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.50)" : "rgba(100, 116, 139, 0.22)";
	const fCore = isDark ? "rgba(203, 213, 225, 0.65)" : "rgba(71, 85, 105, 0.45)";
	const crFill = isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)";
	const crStroke = isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.60)";
	const wrinkles = TOOTH15_GEOMETRY.supplementalGrooves.map((g) => g.d).join(" ");

	return (
		<g id="tooth15-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH15_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth15-cusp-ridges" clipPath="url(#tooth15-crown-clip)">
					{/* Buccal Cervical Convexity Ridge */}
					<path
						d={TOOTH15_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH15_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* 2 Equal-Height Balanced Cusps: Buccal (B) & Palatal (P) */}
					{TOOTH15_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth15-fissures" clipPath="url(#tooth15-crown-clip)">
					{/* Central Sulcus */}
					<path
						d={TOOTH15_GEOMETRY.sulcusCentralis}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.85"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH15_GEOMETRY.sulcusCentralis}
						fill="none"
						stroke={fCore}
						strokeWidth="0.45"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Wheeler Hallmark: Multiple Supplemental Branching Wrinkles */}
					<path
						d={wrinkles}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.65"
						strokeLinecap="round"
						opacity="0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={wrinkles}
						fill="none"
						stroke={fCore}
						strokeWidth="0.35"
						strokeLinecap="round"
						opacity="0.8"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
