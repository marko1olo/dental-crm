import React from "react";
import { TOOTH18_GEOMETRY, TOOTH18_ROOTS_GEOMETRY } from "./tooth18GeometryConstants";

export interface Tooth18RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Fused Conical Roots for Upper Third Molar 18 (Wheeler Ch. 12).
 * Monolithic fused root trunk with sharp distal hook, 3 lobes defined by deep fusion grooves.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18Roots: React.FC<Tooth18RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const g = TOOTH18_ROOTS_GEOMETRY;

	return (
		<g id="tooth18-roots" {...(className ? { className } : {})}>
			{/* LAYER 1: Fused Conical Root Monolith (Zero through-hole window) */}
			<path
				id="tooth18-roots-fused"
				d={g.fusedConicalRootPath}
				fill="url(#dente-root-dentin-18)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth18-root-clip)">
				<path
					d={g.fusedConicalRootPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 3: Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id="tooth18-cej"
					d={TOOTH18_GEOMETRY.cejCurve}
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
