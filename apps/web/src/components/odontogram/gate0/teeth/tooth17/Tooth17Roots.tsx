import React from "react";
import { TOOTH17_GEOMETRY, TOOTH17_ROOTS_GEOMETRY } from "./tooth17GeometryConstants";

export interface Tooth17RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical 2.5D Multi-Root Trifurcation for Upper Second Molar 17 (Wheeler Ch. 12).
 * Convergent roots with distal sweep; MB and DB on foreground, massive Palatal on background.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth17Roots: React.FC<Tooth17RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const palatalStroke = isDark ? "rgba(203, 213, 225, 0.20)" : "rgba(71, 85, 105, 0.22)";
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH17_ROOTS_GEOMETRY;

	return (
		<g id="tooth17-roots" {...(className ? { className } : {})}>
			{/* LAYER 1 (BACKGROUND): Palatal Root in Lingual Depth */}
			<path
				id="tooth17-root-palatal"
				d={g.palatalRootPath}
				fill={isDark ? "url(#dente-root-dentin-17)" : "url(#dente-root-palatal-dentin-17)"}
				stroke={palatalStroke}
				strokeWidth="0.7"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={g.palatalRootPath}
				fill={isDark ? "url(#dente-palatal-contour-dark)" : "url(#dente-palatal-contour)"}
				pointerEvents="none"
			/>

			{/* LAYER 1.5: 2.5D Contact Shadows on Palatal Root (Clipped to Palatal Silhouette) */}
			<g clipPath="url(#tooth17-palatal-clip)">
				<path
					id="tooth17-saddle-shadow"
					d={g.saddleShadowPath}
					fill={isDark ? "url(#dente-saddle-shadow-17-dark)" : "url(#dente-saddle-shadow-17)"}
					pointerEvents="none"
				/>
				<path
					id="tooth17-mb-cast-shadow"
					d={g.mbCastShadowPath}
					fill={isDark ? "url(#dente-mb-cast-shadow-17-dark)" : "url(#dente-mb-cast-shadow-17)"}
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 2 (FOREGROUND): Convergent Buccal Roots (MB + DB) & Root Trunk */}
			<path
				id="tooth17-roots-buccal"
				d={g.buccalRootsMonolithPath}
				fill="url(#dente-root-dentin-17)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth17-root-clip)">
				<path
					d={g.buccalRootsMonolithPath}
					fill={isDark ? "url(#dente-root-contour-dark)" : "url(#dente-root-contour)"}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 3: Anatomical Sulci & Buccal Trunk Developmental Groove */}
			{showGrooves && (
				<>
					<path id="tooth17-mb-sulcus" d={g.mbSulcusLongitudinalis} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id="tooth17-db-groove" d={g.dbDevelopmentalGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id="tooth17-trunk-groove" d={g.buccalTrunkGroove} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</>
			)}

			{/* LAYER 4: Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id="tooth17-cej"
					d={TOOTH17_GEOMETRY.cejCurve}
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
