import type React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH44_CUSPS } from "./tooth44CuspGeometry";
import { TOOTH44_GEOMETRY } from "./tooth44Geometry";

export interface Tooth44OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth44OcclusalCusps: React.FC<Tooth44OcclusalCuspsProps> = ({
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
	const fossae = TOOTH44_GEOMETRY.fossaeAndGrooves.map((f) => f.d).join(" ");

	return (
		<g id="tooth44-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH44_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth44-cusp-ridges" clipPath="url(#tooth44-crown-clip)">
					{/* Buccal Cervical Ridge */}
					<path
						d={TOOTH44_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH44_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* 2 Asymmetric Cusps: Dominant B & Diminutive L */}
					{TOOTH44_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
					{/* Transverse Ridge (Crista Transversa) connecting B and L cusps */}
					<path
						d={TOOTH44_GEOMETRY.transverseRidge}
						fill="none"
						stroke={isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.35)"}
						strokeWidth="1.2"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH44_GEOMETRY.transverseRidgeHighlight}
						fill="none"
						stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.50)"}
						strokeWidth="0.6"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
			{showFissures && (
				<g id="tooth44-fissures" clipPath="url(#tooth44-crown-clip)">
					{/* Mesial & Distal Fossae Cups and Developmental Grooves */}
					<path
						d={fossae}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.8"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={fossae}
						fill="none"
						stroke={fCore}
						strokeWidth="0.45"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
		</g>
	);
};
