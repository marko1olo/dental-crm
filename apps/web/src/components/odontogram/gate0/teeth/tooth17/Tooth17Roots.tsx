import React from "react";
import { TOOTH17_GEOMETRY, TOOTH17_ROOTS_GEOMETRY } from "./tooth17GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

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
	const tNum = useToothNumber() ?? 17;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark ? "#94a3b8" : "rgba(71, 85, 105, 0.45)";
	const palatalStroke = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(71, 85, 105, 0.22)";
	const grooveStroke = isDark ? "rgba(148, 163, 184, 0.30)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH17_ROOTS_GEOMETRY;

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* LAYER 1 (BACKGROUND): Palatal Root in Lingual Depth */}
			<path
				id={sid(`tooth${tNum}-root-palatal`)}
				d={g.palatalRootPath}
				fill={`url(#${sid(isDark ? `dente-root-dentin-${tNum}` : `dente-root-palatal-dentin-${tNum}`)})`}
				stroke={palatalStroke}
				strokeWidth="0.7"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={g.palatalRootPath}
				fill={`url(#${sid(isDark ? "dente-palatal-contour-dark" : "dente-palatal-contour")})`}
				pointerEvents="none"
			/>

			{/* LAYER 1.5: 2.5D Contact Shadows on Palatal Root (Clipped to Palatal Silhouette) */}
			<g clipPath={`url(#${sid(`tooth${tNum}-palatal-clip`)})`}>
				<path
					id={sid(`tooth${tNum}-saddle-shadow`)}
					d={g.saddleShadowPath}
					fill={`url(#${sid(isDark ? `dente-saddle-shadow-${tNum}-dark` : `dente-saddle-shadow-${tNum}`)})`}
					pointerEvents="none"
				/>
				<path
					id={sid(`tooth${tNum}-mb-cast-shadow`)}
					d={g.mbCastShadowPath}
					fill={`url(#${sid(isDark ? `dente-mb-cast-shadow-${tNum}-dark` : `dente-mb-cast-shadow-${tNum}`)})`}
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 2 (FOREGROUND): Convergent Buccal Roots (MB + DB) & Root Trunk */}
			<path
				id={sid(`tooth${tNum}-roots-buccal`)}
				d={g.buccalRootsMonolithPath}
				fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={g.buccalRootsMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 3: Anatomical Sulci & Buccal Trunk Developmental Groove */}
			{showGrooves && (
				<>
					<path id={sid(`tooth${tNum}-mb-sulcus`)} d={g.mbSulcusLongitudinalis} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id={sid(`tooth${tNum}-db-groove`)} d={g.dbDevelopmentalGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id={sid(`tooth${tNum}-trunk-groove`)} d={g.buccalTrunkGroove} fill="none" stroke={grooveStroke} strokeWidth="0.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</>
			)}

			{/* LAYER 4: Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id={sid(`tooth${tNum}-cej`)}
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
