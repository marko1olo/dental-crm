import React from "react";
import { Tooth11SingleCusp } from "./Tooth11SingleCusp";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Incisal Edge & Labial Face for Upper Central Incisor 11.
 * Wheeler Ch. 6: Sharp 90° mesio-incisal angle, soft developmental mamelon lines.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11OcclusalCusps: React.FC<Tooth11OcclusalCuspsProps> = ({
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
		? "rgba(255, 255, 255, 0.12)"
		: "rgba(148, 163, 184, 0.14)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-11-dark)"
		: "url(#dente-cervical-ridge-11)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.16)"
		: "rgba(255, 255, 255, 0.35)";
	const fissures = TOOTH11_GEOMETRY.fissuresY5.map((f) => f.d).join(" ");

	return (
		<g id="tooth11-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH11_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain-11)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth11-cusp-ridges" clipPath="url(#tooth11-crown-clip)">
					{/* Cervical Ridge Convexity below CEJ */}
					<path
						d={TOOTH11_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke="none"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH11_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Incisal Edge & Cingulum */}
					{TOOTH11_GEOMETRY.cusps.map((cusp) => (
						<Tooth11SingleCusp key={cusp.id} cusp={cusp} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && fissures.trim() !== "" && (
				<g id="tooth11-fissures" pointerEvents="none">
					{/* Soft Anatomical Mamelon Developmental Grooves */}
					<path
						d={fissures}
						fill="none"
						stroke={fissureStroke}
						strokeWidth="0.42"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
