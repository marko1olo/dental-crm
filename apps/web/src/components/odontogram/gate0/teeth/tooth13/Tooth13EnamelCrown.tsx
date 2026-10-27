import React from "react";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH13_GEOMETRY } from "./tooth13Geometry";
import { TOOTH13_CARIES_GEOMETRY } from "./tooth13CariesGeometry";

export interface Tooth13EnamelCrownProps {
	stroke?: string | undefined;
	crownOpacity?: string | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	className?: string | undefined;
}

export const Tooth13EnamelCrown: React.FC<Tooth13EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	cariesType,
	cariesSurface,
	className,
}) => {
	const g = TOOTH13_GEOMETRY;
	const isC5 = cariesType === "class5";
	const isC3 = cariesType === "class3";
	const isDistal = cariesSurface === "distal" || cariesSurface === "D";
	const destructCutout = isC5
		? TOOTH13_CARIES_GEOMETRY.destructiveCutoutClass5
		: isC3
		? (isDistal ? TOOTH13_CARIES_GEOMETRY.destructiveCutoutClass3Distal : TOOTH13_CARIES_GEOMETRY.destructiveCutoutClass3Mesial)
		: (isDistal ? TOOTH13_CARIES_GEOMETRY.destructiveCutoutClass4Distal : TOOTH13_CARIES_GEOMETRY.destructiveCutoutClass4Mesial);

	return (
		<g
			id="tooth13-crown"
			className={className}
			opacity={crownOpacity}
			mask={destructive ? "url(#tooth13-crown-destruct-mask)" : undefined}
		>
			<defs>
				<clipPath id="tooth13-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
				{destructive && (
					<mask id="tooth13-crown-destruct-mask">
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
			<g clipPath="url(#tooth13-crown-clip)">
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
				{/* Massive Central Labial Ridge & Highlight */}
				<path d={g.labialRidge} fill="none" stroke="rgba(148, 163, 184, 0.28)" strokeWidth="1.6" strokeLinecap="round" />
				<path d={g.labialRidgeHighlight} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.65)"} strokeWidth="1.0" strokeLinecap="round" />
				{/* Prominent Cingulum */}
				<path d={g.cingulum} fill="none" stroke="rgba(148, 163, 184, 0.32)" strokeWidth="1.2" strokeLinecap="round" />
				{/* Convex Equator Highlight */}
				<path d={g.crownEquatorHighlight} fill="none" stroke="rgba(255, 255, 255, 0.30)" strokeWidth="1.8" strokeLinecap="round" />
			</g>
		</g>
	);
};
