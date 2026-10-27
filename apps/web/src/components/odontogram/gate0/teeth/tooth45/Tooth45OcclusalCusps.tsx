import React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH45_CUSPS } from "./tooth45CuspGeometry";
import { TOOTH45_GEOMETRY } from "./tooth45Geometry";

export interface Tooth45OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth45OcclusalCusps: React.FC<Tooth45OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(100, 116, 139, 0.15)";
	const fCore = isDark ? "rgba(203, 213, 225, 0.45)" : "rgba(71, 85, 105, 0.30)";
	const crFill = isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)";
	const crStroke = isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH45_GEOMETRY.fissuresYPattern.map((f) => f.d).join(" ");

	return (
		<g id="tooth45-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH45_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth45-cusp-ridges" clipPath="url(#tooth45-crown-clip)">
					{/* Buccal Cervical Ridge */}
					<path
						d={TOOTH45_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH45_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* 3 Cusps: 1 Buccal (B), 2 Lingual (ML, DL) */}
					{TOOTH45_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth45-fissures" clipPath="url(#tooth45-crown-clip)">
					{/* Classical Y-shaped Fissure Pattern without artificial pit circles */}
					<path
						d={fissures}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.6"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fissures}
						fill="none"
						stroke={fCore}
						strokeWidth="0.38"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
