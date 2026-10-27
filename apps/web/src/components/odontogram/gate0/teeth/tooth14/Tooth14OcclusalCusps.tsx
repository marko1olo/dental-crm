import React from "react";
import { Tooth14SingleCusp } from "./Tooth14SingleCusp";
import { TOOTH14_GEOMETRY } from "./tooth14GeometryConstants";

export interface Tooth14OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Occlusal Cusps & Ridge for Upper First Premolar Tooth 14.
 * Wheeler Ch. 9: Prominent buccal ridge, longer mesial slope, cervical convexity.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14OcclusalCusps: React.FC<Tooth14OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fissureStroke = isDark
		? "rgba(203, 213, 225, 0.28)"
		: "rgba(148, 163, 184, 0.22)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-14-dark)"
		: "url(#dente-cervical-ridge-14)";
	const crStroke = isDark
		? "rgba(255, 255, 255, 0.20)"
		: "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH14_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth14-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH14_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-14)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth14-cusp-ridges" clipPath="url(#tooth14-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH14_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH14_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Cusps: Buccal and Lingual */}
					{TOOTH14_GEOMETRY.cusps.map((cusp) => (
						<Tooth14SingleCusp key={cusp.id} cusp={cusp} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && fissures.trim() !== "" && (
				<g id="tooth14-fissures" pointerEvents="none">
					{/* Soft Anatomical Developmental Grooves & Sulci */}
					<path
						d={fissures}
						fill="none"
						stroke={fissureStroke}
						strokeWidth="0.45"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
