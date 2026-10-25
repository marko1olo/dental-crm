import React from "react";
import { TOOTH41_GEOMETRY } from "./tooth41Geometry";

export interface Tooth41RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Slender straight single root for Tooth 41 (Mandibular Central Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth41Roots: React.FC<Tooth41RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH41_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";
	const sulcusStroke = isDark
		? "rgba(15, 23, 42, 0.50)"
		: "rgba(120, 95, 65, 0.25)";

	return (
		<g id="tooth41-root-complex" className={className}>
			<defs>
				<clipPath id="tooth41-root-clip">
					<path d={g.rootMonolithPath} />
				</clipPath>
			</defs>
			<path
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				opacity={isEndo ? "0.90" : "1.0"}
				vectorEffect="non-scaling-stroke"
			/>
			{/* Cylindrical Volume Shading & Highlights (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth41-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{/* Cervical Margin (CEJ) */}
			<path
				d={g.cejPath}
				fill="none"
				stroke={stroke}
				strokeWidth="0.75"
				strokeLinecap="round"
				opacity="0.85"
			/>
		</g>
	);
};
