import React from "react";
import { Tooth13SingleCusp } from "./Tooth13SingleCusp";
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";

export interface Tooth13OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Cusp & Labial Ridge for Upper Canine Tooth 13.
 * Wheeler Ch. 8: Prominent labial ridge, shorter mesial slope, cervical convexity.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13OcclusalCusps: React.FC<Tooth13OcclusalCuspsProps> = ({
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
		? "rgba(255, 255, 255, 0.16)"
		: "rgba(148, 163, 184, 0.18)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-13-dark)"
		: "url(#dente-cervical-ridge-13)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.16)"
		: "rgba(255, 255, 255, 0.35)";
	const fissures = TOOTH13_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth13-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH13_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-13)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth13-cusp-ridges" clipPath="url(#tooth13-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH13_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH13_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Canine Cusp & Cingulum */}
					{TOOTH13_GEOMETRY.cusps.map((cusp) => (
						<Tooth13SingleCusp key={cusp.id} cusp={cusp} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && fissures.trim() !== "" && (
				<g id="tooth13-fissures" pointerEvents="none">
					{/* Soft Anatomical Labial Depression Grooves */}
					<path
						d={fissures}
						fill="none"
						stroke={fissureStroke}
						strokeWidth="0.6"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
