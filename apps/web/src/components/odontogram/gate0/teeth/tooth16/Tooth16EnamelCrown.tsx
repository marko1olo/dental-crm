import React from "react";
import { TOOTH16_CUSPS, TOOTH16_GEOMETRY } from "./tooth16Geometry";

export interface Tooth16EnamelCrownProps {
	stroke: string;
	crownOpacity?: string | undefined;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	showCristaObliqua?: boolean | undefined;
	showCarabelli?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
}

export const Tooth16EnamelCrown: React.FC<Tooth16EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	showCristaObliqua = true,
	showCarabelli = true,
	isDark = false,
	destructive = false,
}) => {
	const geo = TOOTH16_GEOMETRY;
	const crownPath = showAbfraction ? geo.crownMonolithPathWithAbfraction : geo.crownMonolithPath;
	const fissureStroke = isDark ? "rgba(148, 163, 184, 0.70)" : "rgba(51, 65, 85, 0.65)";
	const specularFill = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.85)";

	return (
		<g id="tooth16-natural-crown-group" mask={destructive ? "url(#tooth16-crown-destruct-mask)" : undefined}>
			<defs>
				{destructive && (
					<mask id="tooth16-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d="M 36,118 C 44,116 54,116 62,120 C 66,130 58,140 48,140 C 38,140 32,130 36,118 Z" fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth16-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth16-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth16-crown-clip)">
				<path d={crownPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
			</g>
			<path id="tooth16-central-basin" d={geo.centralBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.40)" : "rgba(226, 232, 240, 0.50)"} />
			<path id="tooth16-distal-basin" d={geo.distalBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(226, 232, 240, 0.45)"} />
			{showCristaObliqua && (
				<g id="tooth16-crista-obliqua">
					<path d={geo.cristaObliquaShadow} stroke={isDark ? "rgba(30, 41, 59, 0.65)" : "rgba(148, 163, 184, 0.5)"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
					<path d={geo.cristaObliquaRidge} stroke={isDark ? "rgba(241, 245, 249, 0.85)" : "#ffffff"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
				</g>
			)}
			{showCarabelli && (
				<g id="tooth16-carabelli-cusp">
					<path d={geo.carabelliCuspPath} fill={isDark ? "rgba(203, 213, 225, 0.25)" : "rgba(241, 245, 249, 0.70)"} stroke={fissureStroke} strokeWidth="0.75" />
					<path d={geo.carabelliGroove} stroke={fissureStroke} strokeWidth="0.9" fill="none" strokeLinecap="round" />
				</g>
			)}
			{showFissures && (
				<g id="tooth16-fissures" fill="none" stroke={fissureStroke} strokeLinecap="round">
					<path d={geo.fissures.sulcusCentralis} strokeWidth="1.1" />
					<path d={geo.fissures.sulcusDistopalatalis} strokeWidth="1.0" />
					<path d={geo.fissures.sulcusBuccalis} strokeWidth="0.8" />
					<circle cx={geo.fissures.centralPit.x} cy={geo.fissures.centralPit.y} r="1.1" fill={fissureStroke} />
					<circle cx={geo.fissures.distalPit.x} cy={geo.fissures.distalPit.y} r="0.9" fill={fissureStroke} />
				</g>
			)}
			{showCusps && (
				<g id="tooth16-cusps-group">
					{TOOTH16_CUSPS.map((c) => (
						<g key={c.id} id={`tooth16-cusp-${c.id}`}>
							<path d={c.ridgePath} stroke={fissureStroke} strokeWidth="0.6" fill="none" />
							<ellipse cx={c.apex.x} cy={c.apex.y} rx="1.6" ry="1.1" fill={specularFill} />
						</g>
					))}
				</g>
			)}
		</g>
	);
};
