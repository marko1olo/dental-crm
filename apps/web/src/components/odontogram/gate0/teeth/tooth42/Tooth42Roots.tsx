import React from "react";
import { TOOTH42_GEOMETRY } from "./tooth42Geometry";

export interface Tooth42RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isEndo?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Slender single root for Tooth 42 (Mandibular Lateral Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth42Roots: React.FC<Tooth42RootsProps> = ({
	isEndo = false,
	isDark = false,
	className,
}) => {
	const g = TOOTH42_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.60)"
		: "rgba(100, 116, 139, 0.40)";
	const sulcusStroke = isDark
		? "rgba(15, 23, 42, 0.50)"
		: "rgba(120, 95, 65, 0.25)";

	return (
		<g id="tooth42-root-complex" className={className}>
			<defs>
				<clipPath id="tooth42-root-clip">
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
			{/* Cylindrical Volume Shading & Highlights (Zero harsh dividing lines!) */}
			<g clipPath="url(#tooth42-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 48.0,74.0 C 46.5,95.0 44.0,116.0 42.2,138.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(255, 255, 255, 0.25)"}
					strokeWidth="2.4"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 48.0,74.0 C 46.5,95.0 44.0,116.0 42.2,138.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)"}
					strokeWidth="0.8"
					strokeLinecap="round"
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
