import type React from "react";
import { TOOTH12_GEOMETRY } from "./tooth12Geometry";

export interface Tooth12RootsProps {
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Slender single root with distal apical curvature for Tooth 12
 * Mandate 8b <= 120 lines.
 */
export const Tooth12Roots: React.FC<Tooth12RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH12_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";

	return (
		<g id="tooth12-root-complex" className={className}>
			<defs>
				<clipPath id="tooth12-root-clip">
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
			<g clipPath="url(#tooth12-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				{/* Natural Longitudinal Developmental Depression */}
				<path
					d={g.rootSulcus}
					fill="none"
					stroke={isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(115, 82, 48, 0.22)"}
					strokeWidth="2.2"
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
