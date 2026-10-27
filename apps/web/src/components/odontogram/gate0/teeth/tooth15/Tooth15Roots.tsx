import React from "react";
import { TOOTH15_GEOMETRY, TOOTH15_ROOTS_GEOMETRY } from "./tooth15GeometryConstants";

export interface Tooth15RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Single Conical Root for Upper Second Premolar 15 (Wheeler Ch. 10).
 * Single tapering root with subtle distal apex tilt.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth15Roots: React.FC<Tooth15RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH15_ROOTS_GEOMETRY;

	return (
		<g id="tooth15-roots" {...(className ? { className } : {})}>
			{/* Single Conical Root Monolith */}
			<path
				id="tooth15-root-monolith"
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin-15)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth15-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* Longitudinal Developmental Depressions */}
			{showGrooves && (
				<>
					<path id="tooth15-mesial-groove" d={g.mesialRadicularGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id="tooth15-distal-groove" d={g.distalRadicularGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</>
			)}

			{/* Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id="tooth15-cej"
					d={TOOTH15_GEOMETRY.cejCurve}
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
