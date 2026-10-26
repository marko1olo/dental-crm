import React from "react";
import { Tooth46SingleCusp } from "../../Tooth46SingleCusp";
import { TOOTH16_CUSPS } from "./tooth16CuspGeometry";
import { TOOTH16_GEOMETRY } from "./tooth16Geometry";

export interface Tooth16OcclusalCuspsProps {
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showCristaObliqua?: boolean | undefined;
	showCarabelli?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth16OcclusalCusps: React.FC<Tooth16OcclusalCuspsProps> = ({
	showCusps = true,
	showFissures = true,
	showCristaObliqua = true,
	showCarabelli = true,
	isDark = false,
	className,
}) => {
	const geo = TOOTH16_GEOMETRY;
	const fShadow = isDark ? "rgba(15, 23, 42, 0.50)" : "rgba(100, 116, 139, 0.25)";
	const fCore = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(51, 65, 85, 0.65)";
	const crFill = isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)";
	const crStroke = isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)";
	const crHighlight = isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.60)";
	const eqHighlight = isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.50)";

	return (
		<g id="tooth16-occlusal-cusps" className={className}>
			<g id="tooth16-cusp-ridges" clipPath="url(#tooth16-crown-clip)">
				{/* Buccal Cervical Ridge convexity in cervical third */}
				<path d={geo.buccalCervicalRidge} fill={crFill} stroke={crStroke} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
				<path d={geo.cervicalRidgeHighlight} fill="none" stroke={crHighlight} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				<path d={geo.crownEquatorHighlight} fill="none" stroke={eqHighlight} strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

				{/* Occlusal Basins */}
				<path id="tooth16-central-basin" d={geo.centralBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.40)" : "rgba(226, 232, 240, 0.50)"} />
				<path id="tooth16-distal-basin" d={geo.distalBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(226, 232, 240, 0.45)"} />

				{/* Cusp of Carabelli (5th cusp on ML surface) */}
				{showCarabelli && (
					<g id="tooth16-carabelli-cusp">
						<path d={geo.carabelliCuspPath} fill={isDark ? "rgba(203, 213, 225, 0.25)" : "rgba(241, 245, 249, 0.70)"} stroke={fCore} strokeWidth="0.75" />
						<path d={geo.carabelliGroove} stroke={fCore} strokeWidth="0.9" fill="none" strokeLinecap="round" />
					</g>
				)}

				{/* Crista Obliqua (Oblique Ridge connecting ML to DB) */}
				{showCristaObliqua && (
					<g id="tooth16-crista-obliqua">
						<path d={geo.cristaObliquaShadow} stroke={isDark ? "rgba(30, 41, 59, 0.65)" : "rgba(148, 163, 184, 0.5)"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
						<path d={geo.cristaObliquaRidge} stroke={isDark ? "rgba(241, 245, 249, 0.85)" : "#ffffff"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
					</g>
				)}

				{/* 4 Primary Cusps: MB, ML, DB, DL with individual slopes */}
				{showCusps && TOOTH16_CUSPS.filter(c => c.id !== "Carabelli").map((c) => (
					<Tooth46SingleCusp key={c.id} cusp={c as any} isDark={isDark} />
				))}
			</g>

			{/* Occlusal Fissures and Pits */}
			{showFissures && (
				<g id="tooth16-fissures" clipPath="url(#tooth16-crown-clip)" fill="none" strokeLinecap="round">
					<path d={geo.fissures.sulcusCentralis} stroke={fShadow} strokeWidth="1.4" />
					<path d={geo.fissures.sulcusCentralis} stroke={fCore} strokeWidth="0.85" />
					<path d={geo.fissures.sulcusDistopalatalis} stroke={fShadow} strokeWidth="1.3" />
					<path d={geo.fissures.sulcusDistopalatalis} stroke={fCore} strokeWidth="0.8" />
					<path d={geo.fissures.sulcusBuccalis} stroke={fShadow} strokeWidth="1.1" />
					<path d={geo.fissures.sulcusBuccalis} stroke={fCore} strokeWidth="0.7" />
					<circle cx={geo.fissures.centralPit.x} cy={geo.fissures.centralPit.y} r="1.3" fill={fCore} />
					<circle cx={geo.fissures.distalPit.x} cy={geo.fissures.distalPit.y} r="1.1" fill={fCore} />
				</g>
			)}
		</g>
	);
};
