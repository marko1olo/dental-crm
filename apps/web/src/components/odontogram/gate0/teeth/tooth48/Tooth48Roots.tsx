import React from "react";
import { TOOTH48_GEOMETRY } from "./tooth48Geometry";

export interface Tooth48RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Fused Conical Roots with Distal Apex Curvature for Mandibular Third Molar 48
 * Wheeler Ch. 11 — Fused root mass with distal hook/bend at apical third
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth48Roots: React.FC<Tooth48RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark
		? "rgba(203, 213, 225, 0.55)"
		: "rgba(71, 85, 105, 0.40)";

	return (
		<g id="tooth48-roots" {...(className ? { className } : {})}>
			<clipPath id="tooth48-root-clip">
				<path d={TOOTH48_GEOMETRY.rootMonolithPath} />
			</clipPath>

			{/* Fused Conical Root Mass with Distal Curvature */}
			<path
				d={TOOTH48_GEOMETRY.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				fillOpacity="1.0"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Cylindrical Volume Shading & Highlights on Fused Root (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth48-root-clip)">
				<path
					d={TOOTH48_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>
			{showCej && (
				<path
					d={TOOTH48_GEOMETRY.cejCurve}
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
