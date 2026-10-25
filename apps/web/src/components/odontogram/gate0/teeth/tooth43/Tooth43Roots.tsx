import type React from "react";
import { TOOTH43_GEOMETRY } from "./tooth43Geometry";

export interface Tooth43RootsProps {
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Longest single root of lower jaw for Tooth 43 (Mandibular Canine)
 * Mandate 8b <= 120 lines.
 */
export const Tooth43Roots: React.FC<Tooth43RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH43_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";
	const sulcusStroke = isDark
		? "rgba(15, 23, 42, 0.50)"
		: "rgba(120, 95, 65, 0.25)";

	return (
		<g id="tooth43-root-complex" className={className}>
			<defs>
				<clipPath id="tooth43-root-clip">
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
			<g clipPath="url(#tooth43-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{/* CEJ line */}
			<path
				d={g.cejPath}
				fill="none"
				stroke={stroke}
				strokeWidth="0.65"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
