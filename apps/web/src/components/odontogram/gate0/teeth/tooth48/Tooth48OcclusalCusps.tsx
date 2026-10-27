import React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH48_CUSPS } from "./tooth48CuspGeometry";
import { TOOTH48_GEOMETRY } from "./tooth48Geometry";

export interface Tooth48OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	renderBaseCrown?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth48OcclusalCusps: React.FC<Tooth48OcclusalCuspsProps> = ({
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
	const fissures = TOOTH48_GEOMETRY.fissuresCrenulated.map((f) => f.d).join(" ");

	return (
		<g id="tooth48-crown" className={className}>
			{renderBaseCrown && (
				<path
					d={TOOTH48_GEOMETRY.crownMonolithPath}
					fill="url(#dente-enamel-porcelain)"
					stroke={stroke}
					strokeWidth="0.8"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{showCusps && (
				<g id="tooth48-cusp-ridges" clipPath="url(#tooth48-crown-clip)">
					{/* Buccal Cervical Ridge in cervical third */}
					<path
						d={TOOTH48_GEOMETRY.buccalCervicalRidge}
						fill={crFill}
						stroke={crStroke}
						strokeWidth="0.6"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={TOOTH48_GEOMETRY.cervicalRidgeHighlight}
						fill="none"
						stroke={crHighlight}
						strokeWidth="0.75"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
					{/* 4 Rounded Cusps: MB, DB, ML, DL */}
					{TOOTH48_CUSPS.map((c) => (
						<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
					))}
				</g>
			)}
			{showFissures && (
				<g id="tooth48-fissures" clipPath="url(#tooth48-crown-clip)">
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
