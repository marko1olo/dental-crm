import React from "react";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH41_GEOMETRY } from "./tooth41Geometry";
import { TOOTH41_CARIES_GEOMETRY } from "./tooth41CariesGeometry";

export interface Tooth41EnamelCrownProps {
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

export const Tooth41EnamelCrown: React.FC<Tooth41EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	cariesType,
	cariesSurface,
	className,
}) => {
	const g = TOOTH41_GEOMETRY;
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(148, 163, 184, 0.15)";
	const isC5 = cariesType === "class5";
	const isC3 = cariesType === "class3";
	const isDistal = cariesSurface === "distal" || cariesSurface === "D";
	const destructCutout = isC5
		? TOOTH41_CARIES_GEOMETRY.destructiveCutoutClass5
		: isC3
		? (isDistal ? TOOTH41_CARIES_GEOMETRY.destructiveCutoutClass3Distal : TOOTH41_CARIES_GEOMETRY.destructiveCutoutClass3Mesial)
		: (isDistal ? TOOTH41_CARIES_GEOMETRY.destructiveCutoutClass4Distal : TOOTH41_CARIES_GEOMETRY.destructiveCutoutClass4Mesial);

	return (
		<g
			id="tooth41-crown"
			className={className}
			opacity={crownOpacity}
			mask={destructive ? "url(#tooth41-crown-destruct-mask)" : undefined}
		>
			<defs>
				<clipPath id="tooth41-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
				{destructive && (
					<mask id="tooth41-crown-destruct-mask">
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
			<g clipPath="url(#tooth41-crown-clip)">
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
				<path d={g.incisalHighlight} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)"} strokeWidth="0.75" strokeLinecap="round" />
			</g>
		</g>
	);
};
