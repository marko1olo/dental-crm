import React from "react";
import { TOOTH11_GEOMETRY, TOOTH11_ROOTS_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Straight Conical Root for Upper Central Incisor 11 (Wheeler Ch. 6).
 * Symmetrical midline cone tapering to blunt apex at Y=12.5.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11Roots: React.FC<Tooth11RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const grooveStroke = isDark ? "rgba(203, 213, 225, 0.18)" : "rgba(100, 116, 139, 0.16)";
	const cejStroke = isDark ? "rgba(203, 213, 225, 0.40)" : "rgba(100, 116, 139, 0.35)";
	const g = TOOTH11_ROOTS_GEOMETRY;

	return (
		<g id="tooth11-roots" {...(className ? { className } : {})}>
			{/* LAYER 1: Straight Conical Root Monolith (Apex Y=12.5) */}
			<path
				id="tooth11-root-monolith"
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin-11)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Cylindrical Volume Shading (Pure shader depth, zero artificial white strokes) */}
			<g clipPath="url(#tooth11-root-clip)">
				<path
					d={g.rootMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* LAYER 2: Subtle Longitudinal Developmental Grooves */}
			{showGrooves && (
				<g id="tooth11-root-grooves" pointerEvents="none">
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
					<path
						d={g.centralRootRidge}
						fill="none"
						stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.30)"}
						strokeWidth="0.6"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* LAYER 3: Cementoenamel Junction (CEJ) */}
			{showCej && (
				<path
					id="tooth11-cej"
					d={TOOTH11_GEOMETRY.cejCurve}
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
