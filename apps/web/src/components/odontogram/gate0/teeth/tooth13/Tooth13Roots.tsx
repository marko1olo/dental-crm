import type React from "react";
import { TOOTH13_GEOMETRY } from "./tooth13Geometry";

export interface Tooth13RootsProps {
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Longest single root of human dentition (reaching Y=8.0) for Tooth 13 (Maxillary Canine)
 * Mandate 8b <= 120 lines.
 */
export const Tooth13Roots: React.FC<Tooth13RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH13_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";

	return (
		<g id="tooth13-root-complex" className={className}>
			<defs>
				<clipPath id="tooth13-root-clip">
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
			{/* Cylindrical Volume Shading & Highlights */}
			<g clipPath="url(#tooth13-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				{/* Deep Longitudinal Root Groove */}
				<path
					d={g.rootSulcus}
					fill="none"
					stroke={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(115, 82, 48, 0.22)"}
					strokeWidth="2.4"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{/* Scalloped Anatomical CEJ */}
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
