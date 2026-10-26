import type React from "react";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH43_GEOMETRY } from "./tooth43Geometry";
import { TOOTH43_CARIES_GEOMETRY } from "./tooth43CariesGeometry";

export interface Tooth43EnamelCrownProps {
	stroke?: string | undefined;
	crownOpacity?: string | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	className?: string | undefined;
}

export const Tooth43EnamelCrown: React.FC<Tooth43EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	cariesType,
	cariesSurface,
	className,
}) => {
	const g = TOOTH43_GEOMETRY;
	const ridgeStroke = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.65)";
	const isC5 = cariesType === "class5";
	const isC3 = cariesType === "class3";
	const isDistal = cariesSurface === "distal" || cariesSurface === "D";
	const destructCutout = isC5
		? TOOTH43_CARIES_GEOMETRY.destructiveCutoutClass5
		: isC3
		? (isDistal ? TOOTH43_CARIES_GEOMETRY.destructiveCutoutClass3Distal : TOOTH43_CARIES_GEOMETRY.destructiveCutoutClass3Mesial)
		: (isDistal ? TOOTH43_CARIES_GEOMETRY.destructiveCutoutClass4Distal : TOOTH43_CARIES_GEOMETRY.destructiveCutoutClass4Mesial);

	return (
		<g
			id="tooth43-crown"
			className={className}
			opacity={crownOpacity}
			mask={destructive ? "url(#tooth43-crown-destruct-mask)" : undefined}
		>
			<defs>
				<clipPath id="tooth43-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
				{destructive && (
					<mask id="tooth43-crown-destruct-mask">
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
			<g clipPath="url(#tooth43-crown-clip)">
				<path d={g.crownMonolithPath} fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"} vectorEffect="non-scaling-stroke" />
				<path d={g.crownMonolithPath} fill={isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)"} vectorEffect="non-scaling-stroke" />
				<path d={g.labialRidgeHighlight} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)"} strokeWidth="3.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				<path d={g.labialRidgeHighlight} fill="none" stroke={ridgeStroke} strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
			</g>
		</g>
	);
};
