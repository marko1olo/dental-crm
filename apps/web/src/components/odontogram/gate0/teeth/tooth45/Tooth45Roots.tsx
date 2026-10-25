import type React from "react";
import { TOOTH45_GEOMETRY } from "./tooth45Geometry";

export interface Tooth45RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Mandibular Second Premolar 45
 * Wheeler Ch. 11 — 1 tapered conical root with longitudinal depression
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth45Roots: React.FC<Tooth45RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth45-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth45-root-clip">
				<path d={TOOTH45_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Monolithic Single Conical Root Mass */}
			<path
				d={TOOTH45_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading & Highlights (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth45-root-clip)">
				<path
					d={TOOTH45_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{showCej && (
				<path
					d={TOOTH45_GEOMETRY.cejCurve}
					fill="none"
					stroke={strokeColor}
					strokeWidth="0.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
