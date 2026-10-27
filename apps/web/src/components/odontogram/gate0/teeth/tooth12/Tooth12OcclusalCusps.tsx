import React from "react";
import { Tooth12SingleCusp } from "./Tooth12SingleCusp";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export interface Tooth12OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Incisal Edge & Labial Face for Upper Lateral Incisor 12.
 * Wheeler Ch. 7: Sharp mesial 90° angle, soft developmental mamelon lines.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12OcclusalCusps: React.FC<Tooth12OcclusalCuspsProps> = ({
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
		? "rgba(148, 163, 184, 0.22)"
		: "rgba(148, 163, 184, 0.18)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-12-dark)"
		: "url(#dente-cervical-ridge-12)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH12_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth12-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH12_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-12)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth12-cusp-ridges" clipPath="url(#tooth12-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH12_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH12_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Incisal Edge & Cingulum */}
					{TOOTH12_GEOMETRY.cusps.map((cusp) => (
						<Tooth12SingleCusp key={cusp.id} cusp={cusp} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth12-fissures" pointerEvents="none">
					{/* Soft Anatomical Mamelon Developmental Grooves */}
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
