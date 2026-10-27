import React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH18_CUSPS } from "./tooth18CuspGeometry";
import { TOOTH18_GEOMETRY } from "./tooth18Geometry";

export interface Tooth18OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth18OcclusalCusps: React.FC<Tooth18OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	isDark = false,
	className,
}) => {
	const geo = TOOTH18_GEOMETRY;
	const fShadow = isDark ? "rgba(15, 23, 42, 0.50)" : "rgba(100, 116, 139, 0.25)";
	const fCore = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(51, 65, 85, 0.65)";
	const crFill = isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)";
	const crStroke = isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.60)";
	const eqHighlight = isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.50)";

	return (
		<g id="tooth18-occlusal-cusps" className={className}>
			<g id="tooth18-cusp-ridges" clipPath="url(#tooth18-crown-clip)">
				{/* Buccal Cervical Ridge convexity in cervical third */}
				<path d={geo.buccalCervicalRidge} fill={crFill} stroke={crStroke} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
				<path d={geo.cervicalRidgeHighlight} fill="none" stroke={crHighlight} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				<path d={geo.crownEquatorHighlight} fill="none" stroke={eqHighlight} strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

				{/* Occlusal Basins */}
				<path id="tooth18-central-basin" d={geo.centralBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.40)" : "rgba(226, 232, 240, 0.50)"} />
				<path id="tooth18-distal-basin" d={geo.distalBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(226, 232, 240, 0.45)"} />

				{/* 3 Cusps: MB, DB, Lingual with individual slopes */}
				{showCusps && TOOTH18_CUSPS.map((c) => (
					<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
				))}
			</g>

			{/* Occlusal Fissures and Pits */}
			{showFissures && (
				<g id="tooth18-fissures" clipPath="url(#tooth18-crown-clip)" fill="none" strokeLinecap="round">
					<path d={geo.fissures.sulcusCentralis} stroke={fShadow} strokeWidth="1.4" />
					<path d={geo.fissures.sulcusCentralis} stroke={fCore} strokeWidth="0.85" />
					<path d={geo.fissures.sulcusDistalis} stroke={fShadow} strokeWidth="1.3" />
					<path d={geo.fissures.sulcusDistalis} stroke={fCore} strokeWidth="0.8" />
					<path d={geo.fissures.sulcusBuccalis} stroke={fShadow} strokeWidth="1.1" />
					<path d={geo.fissures.sulcusBuccalis} stroke={fCore} strokeWidth="0.7" />
					<circle cx={geo.fissures.centralPit.x} cy={geo.fissures.centralPit.y} r="1.3" fill={fCore} />
				</g>
			)}
		</g>
	);
};
