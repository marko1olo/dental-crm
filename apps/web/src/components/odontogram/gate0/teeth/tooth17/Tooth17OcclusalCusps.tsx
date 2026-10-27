import React from "react";
import { Tooth17SingleCusp } from "./Tooth17SingleCusp";
import { TOOTH17_GEOMETRY } from "./tooth17GeometryConstants";

export interface Tooth17OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Occlusal Cusps & Fissures for Upper Second Molar Tooth 17.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth17OcclusalCusps: React.FC<Tooth17OcclusalCuspsProps> = ({
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
		? "url(#dente-cervical-ridge-17-dark)"
		: "url(#dente-cervical-ridge-17)";
	const crStroke = isDark
		? "rgba(255, 255, 255, 0.20)"
		: "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH17_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth17-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH17_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-17)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth17-cusp-ridges" clipPath="url(#tooth17-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH17_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH17_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{TOOTH17_GEOMETRY.cusps.map((c) => (
						<Tooth17SingleCusp key={c.id} cusp={c} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth17-fissures" clipPath="url(#tooth17-crown-clip)">
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
						cx={TOOTH17_GEOMETRY.fissures.buccalPit.cx}
						cy={TOOTH17_GEOMETRY.fissures.buccalPit.cy}
						r={TOOTH17_GEOMETRY.fissures.buccalPit.r}
						fill={fCore}
						opacity="0.25"
					/>
				</g>
			)}
		</g>
	);
};
