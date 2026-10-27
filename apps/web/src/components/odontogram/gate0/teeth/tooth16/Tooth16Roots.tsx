import React from "react";
import { TOOTH16_GEOMETRY, TOOTH16_ROOTS_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical 2.5D Multi-Root Trifurcation for Maxillary Molar 16 (Wheeler Ch. 11).
 * Foreground: MB + DB + Root Trunk. Background: Palatal root with directional contact shadows.
 */
export const Tooth16Roots: React.FC<Tooth16RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const strokeColor = isDark ? "rgba(203, 213, 225, 0.55)" : "rgba(71, 85, 105, 0.40)";
	const palatalStroke = isDark ? "rgba(203, 213, 225, 0.20)" : "rgba(71, 85, 105, 0.22)";
	const grooveStroke = isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH16_ROOTS_GEOMETRY;

	return (
		<g id="tooth16-roots" {...(className ? { className } : {})}>
			{/* LAYER 1 (BACKGROUND): Palatal Root in Lingual Depth */}
			<path
				id="tooth16-root-palatal"
				d={g.palatalRootPath}
				fill={isDark ? "url(#dente-root-dentin-16)" : "url(#dente-root-palatal-dentin-16)"}
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
			<g clipPath="url(#tooth16-palatal-clip)">
				<path
					id="tooth16-saddle-shadow"
					d={g.saddleShadowPath}
					fill={isDark ? "url(#dente-saddle-shadow-dark)" : "url(#dente-saddle-shadow)"}
					pointerEvents="none"
				/>
				<path
					id="tooth16-mb-cast-shadow"
					d={g.mbCastShadowPath}
					fill={isDark ? "url(#dente-mb-cast-shadow-dark)" : "url(#dente-mb-cast-shadow)"}
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 2 (FOREGROUND): Buccal Roots (MB + DB) & 4mm Root Trunk Monolith */}
			<path
				id="tooth16-roots-buccal"
				d={g.buccalRootsMonolithPath}
				fill="url(#dente-root-dentin-16)"
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath="url(#tooth16-root-clip)">
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
					<path id="tooth16-mb-sulcus" d={g.mbSulcusLongitudinalis} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id="tooth16-db-groove" d={g.dbDevelopmentalGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id="tooth16-trunk-groove" d={g.buccalTrunkGroove} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</>
			)}

			{/* LAYER 4: Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id="tooth16-cej"
					d={TOOTH16_GEOMETRY.cejCurve}
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
