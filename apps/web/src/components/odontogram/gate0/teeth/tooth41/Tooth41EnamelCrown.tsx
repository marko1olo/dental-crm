import React from "react";
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
	className?: string | undefined;
}

/**
 * Bilaterally symmetrical chisel enamel crown for Tooth 41 (Mandibular Central Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth41EnamelCrown: React.FC<Tooth41EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	className,
}) => {
	const g = TOOTH41_GEOMETRY;

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
						<path d={TOOTH41_CARIES_GEOMETRY.destructiveCutout} fill="#000000" />
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
			{/* Symmetrical labial grooves, 3D volume, and crisp incisal highlight */}
			<g clipPath="url(#tooth41-crown-clip)">
				{/* 3D Cylindrical Proximal Contour Volume */}
				<path
					d={g.crownMonolithPath}
					fill={isDark ? "url(#dente-proximal-contour-dark)" : "url(#dente-proximal-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				{/* Cervical Ridge Convexity */}
				<path
					d={g.crownMonolithPath}
					fill={isDark ? "url(#dente-cervical-ridge-dark)" : "url(#dente-cervical-ridge)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={g.labialGrooveMesial}
					fill="none"
					stroke="rgba(148, 163, 184, 0.20)"
					strokeWidth="0.7"
					strokeLinecap="round"
				/>
				<path
					d={g.labialGrooveDistal}
					fill="none"
					stroke="rgba(148, 163, 184, 0.20)"
					strokeWidth="0.7"
					strokeLinecap="round"
				/>
				<path
					d={g.incisalHighlight}
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)"}
					strokeWidth="0.75"
					strokeLinecap="round"
				/>
			</g>
		</g>
	);
};
