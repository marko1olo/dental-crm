import React from "react";
import { TOOTH17_CUSPS, TOOTH17_GEOMETRY } from "./tooth17Geometry";

export interface Tooth17EnamelCrownProps {
	stroke: string;
	crownOpacity?: string | undefined;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
}

export const Tooth17EnamelCrown: React.FC<Tooth17EnamelCrownProps> = ({
	stroke,
	crownOpacity = "1.0",
	showCusps = true,
	showFissures = true,
	showAbfraction = false,
	isDark = false,
	destructive = false,
}) => {
	const geo = TOOTH17_GEOMETRY;
	const crownPath = showAbfraction ? geo.crownMonolithPathWithAbfraction : geo.crownMonolithPath;
	const fissureStroke = isDark ? "rgba(148, 163, 184, 0.70)" : "rgba(51, 65, 85, 0.65)";
	const specularFill = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.85)";

	return (
		<g id="tooth17-natural-crown-group" mask={destructive ? "url(#tooth17-crown-destruct-mask)" : undefined}>
			<defs>
				{destructive && (
					<mask id="tooth17-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d="M 38,118 C 45,116 53,116 60,120 C 64,130 57,139 48,139 C 39,139 34,130 38,118 Z" fill="#000000" />
					</mask>
				)}
			</defs>
			<clipPath id="tooth17-crown-clip">
				<path d={crownPath} />
			</clipPath>
			<path
				id="tooth17-crown-monolith"
				d={crownPath}
				fill="url(#dente-enamel-porcelain)"
				fillOpacity={crownOpacity}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth17-crown-clip)">
				<path d={crownPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
			</g>
			<path id="tooth17-central-basin" d={geo.centralBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.40)" : "rgba(226, 232, 240, 0.50)"} />
			<path id="tooth17-distal-basin" d={geo.distalBasinPath} fill={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(226, 232, 240, 0.45)"} />
			{showFissures && (
				<g id="tooth17-fissures" fill="none" stroke={fissureStroke} strokeLinecap="round">
					<path d={geo.fissures.sulcusCentralis} strokeWidth="1.1" />
					<path d={geo.fissures.sulcusDistopalatalis} strokeWidth="1.0" />
					<path d={geo.fissures.sulcusBuccalis} strokeWidth="0.8" />
					<circle cx={geo.fissures.centralPit.x} cy={geo.fissures.centralPit.y} r="1.1" fill={fissureStroke} />
					<circle cx={geo.fissures.distalPit.x} cy={geo.fissures.distalPit.y} r="0.9" fill={fissureStroke} />
				</g>
			)}
			{showCusps && (
				<g id="tooth17-cusps-group">
					{TOOTH17_CUSPS.map((c) => (
						<g key={c.id} id={`tooth17-cusp-${c.id}`}>
							<path d={c.ridgePath} stroke={fissureStroke} strokeWidth="0.6" fill="none" />
							<ellipse cx={c.apex.x} cy={c.apex.y} rx="1.5" ry="1.0" fill={specularFill} />
						</g>
					))}
				</g>
			)}
		</g>
	);
};
