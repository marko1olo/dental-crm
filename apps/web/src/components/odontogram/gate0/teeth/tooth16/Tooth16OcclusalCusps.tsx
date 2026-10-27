import React from "react";
import { Tooth16SingleCusp } from "./Tooth16SingleCusp";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Occlusal Cusps & Fissures for Upper Molar Tooth 16.
 * Stage 1: Vertically inverted base.
 * Mandate 8b <= 120 lines.
 */
export const Tooth16OcclusalCusps: React.FC<Tooth16OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(100, 116, 139, 0.28)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.55)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-16-dark)"
		: "url(#dente-cervical-ridge-16)";
	const crStroke = isDark
		? "rgba(255, 255, 255, 0.20)"
		: "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH16_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth16-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH16_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-16)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth16-cusp-ridges" clipPath="url(#tooth16-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH16_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH16_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{TOOTH16_GEOMETRY.cusps.map((c) => (
						<Tooth16SingleCusp key={c.id} cusp={c} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth16-fissures" clipPath="url(#tooth16-crown-clip)">
					<path
						d={fissures}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fissures}
						fill="none"
						stroke={fCore}
						strokeWidth="0.45"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<circle
						cx={TOOTH16_GEOMETRY.fissures.buccalPit.cx}
						cy={TOOTH16_GEOMETRY.fissures.buccalPit.cy}
						r={TOOTH16_GEOMETRY.fissures.buccalPit.r}
						fill={fCore}
						opacity="0.25"
					/>
				</g>
			)}
		</g>
	);
};
