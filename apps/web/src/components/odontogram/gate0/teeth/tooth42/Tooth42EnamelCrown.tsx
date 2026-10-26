import React from "react";
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
	className?: string | undefined;
}

/**
 * Chisel-shaped enamel crown for Tooth 42 (Mandibular Lateral Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth42EnamelCrown: React.FC<Tooth42EnamelCrownProps> = ({
	stroke = "rgba(71, 85, 105, 0.45)",
	crownOpacity = "1.0",
	isDark = false,
	destructive = false,
	className,
}) => {
	const g = TOOTH42_GEOMETRY;

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
						<path d={TOOTH42_CARIES_GEOMETRY.destructiveCutout} fill="#000000" />
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
			{/* Developmental labial grooves, 3D volume, and incisal light edge */}
			<g clipPath="url(#tooth42-crown-clip)">
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
					strokeWidth="0.7"
					strokeLinecap="round"
				/>
			</g>
		</g>
	);
};
