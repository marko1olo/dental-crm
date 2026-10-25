import type React from "react";
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

			{/* Cylindrical Volume Shading & Highlights on Fused Root (Zero harsh lines!) */}
			<g clipPath="url(#tooth48-root-clip)">
				<path
					d={TOOTH48_GEOMETRY.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 48.0,76.0 C 44.5,98.0 39.0,120.0 34.5,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(255, 255, 255, 0.25)"}
					strokeWidth="2.8"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M 48.0,76.0 C 44.5,98.0 39.0,120.0 34.5,142.0"
					fill="none"
					stroke={isDark ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.40)"}
					strokeWidth="0.8"
					strokeLinecap="round"
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
