import React from "react";
import { TOOTH17_GEOMETRY } from "./tooth17Geometry";
import { Tooth17OcclusalCusps } from "./Tooth17OcclusalCusps";

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

	return (
		<g id="tooth17-natural-crown-group" mask={destructive ? "url(#tooth17-crown-destruct-mask)" : undefined}>
			<defs>
				{destructive && (
					<mask id="tooth17-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d="M 36,118 C 44,116 54,116 62,120 C 66,130 58,140 48,140 C 38,140 32,130 36,118 Z" fill="#000000" />
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
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth17OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				isDark={isDark}
			/>
		</g>
	);
};
