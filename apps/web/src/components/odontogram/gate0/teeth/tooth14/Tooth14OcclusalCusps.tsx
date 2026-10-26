import type React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH14_CUSPS } from "./tooth14CuspGeometry";
import { TOOTH14_GEOMETRY } from "./tooth14Geometry";

export interface Tooth14OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical 3D Cusp Slopes, Lobes & Dual Fissures for Maxillary First Premolar 14
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth14OcclusalCusps: React.FC<Tooth14OcclusalCuspsProps> = ({
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
	const fossae = TOOTH14_GEOMETRY.fossaeAndGrooves.map((f) => f.d).join(" ");

	return (
		<g id="tooth14-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH14_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth14-cusp-ridges" clipPath="url(#tooth14-crown-clip)">
					{/* Buccal Cervical Convexity Ridge */}
					<path
						d={TOOTH14_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
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
					{/* 2 Cusps: Dominant Sharp Buccal (B) & Softer Palatal (P) */}
					{TOOTH14_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
					{/* Wheeler Signature: Mesial Marginal Developmental Groove */}
					<path
						d={TOOTH14_GEOMETRY.mesialMarginalGroove}
						fill="none"
						stroke={fShadow}
						strokeWidth="0.9"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH14_GEOMETRY.mesialMarginalGroove}
						fill="none"
						stroke={fCore}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}
			{showFissures && (
				<g id="tooth14-fissures" clipPath="url(#tooth14-crown-clip)">
					{/* Central Sulcus & Triangular Developmental Grooves */}
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
