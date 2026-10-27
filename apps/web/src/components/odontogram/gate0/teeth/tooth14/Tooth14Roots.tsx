import React from "react";
import { TOOTH14_GEOMETRY, TOOTH14_ROOTS_GEOMETRY } from "./tooth14GeometryConstants";

export interface Tooth14RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical 2.5D Bifurcated Roots for Upper First Premolar 14 (Wheeler Ch. 9).
 * Layer 1 (Background): Palatal root in lingual depth (Apex at 54.5, 10.5).
 * Layer 1.5: Saddle contact shadow at bifurcation crotch (Y ≈ 53.0).
 * Layer 2 (Foreground): Buccal root and root trunk monolith (Apex at 44.0, 12.0).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14Roots: React.FC<Tooth14RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const palatalStroke = isDark ? "rgba(203, 213, 225, 0.20)" : "rgba(71, 85, 105, 0.20)";
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH14_ROOTS_GEOMETRY;

	return (
		<g id="tooth14-roots" {...(className ? { className } : {})}>
			{/* LAYER 1 (BACKGROUND): Palatal Root in Lingual Depth */}
			<path
				id="tooth14-root-palatal"
				d={g.palatalRootPath}
				fill={isDark ? "url(#dente-root-dentin-14)" : "url(#dente-root-palatal-dentin-14)"}
				stroke={palatalStroke}
				strokeWidth="0.7"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Soft Natural Furcation Ambient Shadow (Seamless, Zero Hard Polygons) */}
			<circle cx="50" cy="53" r="12" fill="url(#dente-crotch-shadow-soft)" pointerEvents="none" />

			{/* LAYER 2 (FOREGROUND): Buccal Root & Root Trunk Monolith */}
			<path
				id="tooth14-root-buccal"
				d={g.buccalRootMonolithPath}
				fill="url(#dente-root-dentin-14)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* LAYER 3: Longitudinal Developmental Grooves (Canine Fossa & Distal) */}
			{showGrooves && (
				<g id="tooth14-root-grooves" pointerEvents="none">
					<path
						d={g.mesialRadicularGroove}
						fill="none"
						stroke={grooveStroke}
						strokeWidth="0.45"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={g.distalRadicularGroove}
						fill="none"
						stroke={grooveStroke}
						strokeWidth="0.45"
						strokeDasharray="1.5 1.0"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* LAYER 4: Cementoenamel Junction (CEJ) */}
			{showCej && (
				<path
					id="tooth14-cej"
					d={TOOTH14_GEOMETRY.cejCurve}
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
