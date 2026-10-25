import React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH47_CUSPS } from "./tooth47CuspGeometry";
import { TOOTH47_GEOMETRY } from "./tooth47Geometry";

export interface Tooth47OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth47OcclusalCusps: React.FC<Tooth47OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	renderBaseCrown = true,
	isDark = false,
	className,
}) => {
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const fShadow = isDark ? "rgba(15, 23, 42, 0.50)" : "rgba(100, 116, 139, 0.22)";
	const fCore = isDark
		? "rgba(203, 213, 225, 0.65)"
		: "rgba(71, 85, 105, 0.45)";
	const crFill = isDark
		? "url(#dente-cervical-ridge-dark)"
		: "url(#dente-cervical-ridge)";
	const crStroke = isDark
		? "rgba(255, 255, 255, 0.20)"
		: "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark
		? "rgba(255, 255, 255, 0.28)"
		: "rgba(255, 255, 255, 0.60)";
	const fissures = TOOTH47_GEOMETRY.fissuresCruciform.map((f) => f.d).join(" ");
	const caecum = TOOTH47_GEOMETRY.foramenCaecum;

	return (
		<g id="tooth47-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH47_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth47-cusp-ridges" clipPath="url(#tooth47-crown-clip)">
					{/* Buccal Cervical Ridge convexity in cervical third */}
					<path
						d={TOOTH47_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH47_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* Exactly 4 cusps: MB, DB, ML, DL (Zero 5th Distal Cusp) */}
					{TOOTH47_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth47-fissures" clipPath="url(#tooth47-crown-clip)">
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
				</g>
			)}
		</g>
	);
};
