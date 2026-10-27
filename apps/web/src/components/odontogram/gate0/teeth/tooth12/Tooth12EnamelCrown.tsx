import React from "react";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH12_GEOMETRY } from "./tooth12Geometry";
import { TOOTH12_CARIES_GEOMETRY } from "./tooth12CariesGeometry";

export interface Tooth12EnamelCrownProps {
	stroke?: string | undefined;
	crownOpacity?: string | undefined;
	isDark?: boolean | undefined;
	destructive?: boolean | undefined;
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	className?: string | undefined;
}

export const Tooth12EnamelCrown: React.FC<Tooth12EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	cariesType,
	cariesSurface,
	className,
}) => {
	const g = TOOTH12_GEOMETRY;
	const isC5 = cariesType === "class5";
	const isC3 = cariesType === "class3";
	const isDistal = cariesSurface === "distal" || cariesSurface === "D";
	const destructCutout = isC5
		? TOOTH12_CARIES_GEOMETRY.destructiveCutoutClass5
		: isC3
		? (isDistal ? TOOTH12_CARIES_GEOMETRY.destructiveCutoutClass3Distal : TOOTH12_CARIES_GEOMETRY.destructiveCutoutClass3Mesial)
		: (isDistal ? TOOTH12_CARIES_GEOMETRY.destructiveCutoutClass4Distal : TOOTH12_CARIES_GEOMETRY.destructiveCutoutClass4Mesial);

	return (
		<g
			id="tooth12-crown"
			className={className}
			opacity={crownOpacity}
			mask={destructive ? "url(#tooth12-crown-destruct-mask)" : undefined}
		>
			<defs>
				<clipPath id="tooth12-crown-clip">
					<path d={g.crownMonolithPath} />
				</clipPath>
				{destructive && (
					<mask id="tooth12-crown-destruct-mask">
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
			<g clipPath="url(#tooth12-crown-clip)">
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
				{/* Developmental Labial Grooves */}
				<path d={g.labialGrooveMesial} fill="none" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1.1" strokeLinecap="round" />
				<path d={g.labialGrooveDistal} fill="none" stroke="rgba(148, 163, 184, 0.22)" strokeWidth="1.1" strokeLinecap="round" />
				{/* Foramen Caecum */}
				<path d={g.foramenCaecum} fill={isDark ? "#1e293b" : "#475569"} opacity="0.6" />
				{/* Convex Equator Highlight & Incisal Bevel */}
				<path d={g.crownEquatorHighlight} fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.8" strokeLinecap="round" />
				<path d={g.incisalHighlight} fill="none" stroke={isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.75)"} strokeWidth="0.85" strokeLinecap="round" />
			</g>
		</g>
	);
};
