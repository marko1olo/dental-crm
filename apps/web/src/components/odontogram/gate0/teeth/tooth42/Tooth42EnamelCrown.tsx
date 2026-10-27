import React from "react";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH42_GEOMETRY } from "./tooth42Geometry";
import { TOOTH42_CARIES_GEOMETRY } from "./tooth42CariesGeometry";

export interface Tooth42EnamelCrownProps {
	stroke?: string | undefined;
	crownOpacity?: string | undefined;
	showCusps?: boolean | undefined;
	showFissures?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	className?: string | undefined;
}

export const Tooth42EnamelCrown: React.FC<Tooth42EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	cariesType,
	cariesSurface,
	className,
}) => {
	const g = TOOTH42_GEOMETRY;
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(148, 163, 184, 0.15)";
	const isC5 = cariesType === "class5";
	const isC3 = cariesType === "class3";
	const isMesial = cariesSurface === "mesial" || cariesSurface === "M";
	const destructCutout = isC5
		? TOOTH42_CARIES_GEOMETRY.destructiveCutoutClass5
		: isC3
		? (isMesial ? TOOTH42_CARIES_GEOMETRY.destructiveCutoutClass3Mesial : TOOTH42_CARIES_GEOMETRY.destructiveCutoutClass3Distal)
		: (isMesial ? TOOTH42_CARIES_GEOMETRY.destructiveCutoutClass4Mesial : TOOTH42_CARIES_GEOMETRY.destructiveCutoutClass4Distal);

	return (
		<g
			id="tooth42-crown"
			className={className}
			opacity={crownOpacity}
			mask={destructive ? "url(#tooth42-crown-destruct-mask)" : undefined}
		>
			<defs>
				<clipPath id="tooth42-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
				{destructive && (
					<mask id="tooth42-crown-destruct-mask">
						<rect x="0" y="0" width="100" height="250" fill="#ffffff" />
						<path d={destructCutout} fill="#000000" />
					</mask>
				)}
			</defs>
			<path
				d={g.crownMonolithPath}
				fill="url(#dente-enamel-porcelain)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth42-crown-clip)">
				<path
					d={g.crownMonolithPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={g.crownMonolithPath}
					fill={isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path d={g.labialGrooveMesial} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				<path d={g.labialGrooveDistal} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				<path d={g.incisalHighlight} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)"} strokeWidth="0.7" strokeLinecap="round" />
			</g>
		</g>
	);
};
