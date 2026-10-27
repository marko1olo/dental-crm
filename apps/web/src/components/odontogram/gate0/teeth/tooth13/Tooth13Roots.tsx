import React from "react";
import { TOOTH13_GEOMETRY, TOOTH13_ROOTS_GEOMETRY } from "./tooth13GeometryConstants";

export interface Tooth13RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Massive Single Root for Upper Canine 13 (Wheeler Ch. 8).
 * Longest root in dentition, tapering to apex at Y=4.5 with distal curvature to the left.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13Roots: React.FC<Tooth13RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(203, 213, 225, 0.18)" : "rgba(100, 116, 139, 0.16)";
	const cejStroke = isDark ? "rgba(203, 213, 225, 0.40)" : "rgba(100, 116, 139, 0.35)";
	const g = TOOTH13_ROOTS_GEOMETRY;

	return (
		<g id="tooth13-roots" {...(className ? { className } : {})}>
			{/* LAYER 1: Massive Single Conical Root Monolith (Apex Y=4.5) */}
			<path
				id="tooth13-root-monolith"
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin-13)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Cylindrical Volume Shading (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth13-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* LAYER 2: Subtle Longitudinal Developmental Grooves & Labial Root Ridge */}
			{showGrooves && (
				<g id="tooth13-root-grooves" pointerEvents="none">
					<path
						d={g.distalRadicularGroove}
						fill="none"
						stroke={grooveStroke}
						strokeWidth="0.5"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.mesialRadicularGroove}
						fill="none"
						stroke={grooveStroke}
						strokeWidth="0.5"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* LAYER 3: Cementoenamel Junction (CEJ) */}
			{showCej && (
				<path
					id="tooth13-cej"
					d={TOOTH13_GEOMETRY.cejCurve}
					fill="none"
					stroke={cejStroke}
					strokeWidth="0.75"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
