import React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16Geometry";
import { Tooth16OcclusalCusps } from "./Tooth16OcclusalCusps";

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

	return (
		<g id="tooth16-natural-crown-group" mask={destructive ? "url(#tooth16-crown-destruct-mask)" : undefined}>
			<defs>
				{destructive && (
					<mask id="tooth16-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d="M 36,104 C 44,102 54,102 62,106 C 66,116 58,126 48,126 C 38,126 32,116 36,104 Z" fill="#000000" />
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
				<path
					d={crownPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			<Tooth16OcclusalCusps
				showCusps={showCusps}
				showFissures={showFissures}
				showCristaObliqua={showCristaObliqua}
				showCarabelli={showCarabelli}
				isDark={isDark}
			/>
		</g>
	);
};
