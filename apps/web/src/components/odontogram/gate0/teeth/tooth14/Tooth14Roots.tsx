import React from "react";
import { TOOTH14_GEOMETRY, TOOTH14_ROOTS_GEOMETRY } from "./tooth14GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth14RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Bifurcated Roots for Upper First Premolar 14 (Wheeler Ch. 9).
 * Palatal Root rendered BEHIND (lingual depth), Buccal Root in foreground.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14Roots: React.FC<Tooth14RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 14;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark ? "#94a3b8" : "rgba(71, 85, 105, 0.45)";
	const palatalStrokeColor = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(71, 85, 105, 0.30)";
	const grooveStroke = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.16)";
	const cejStroke = isDark ? "#cbd5e1" : "rgba(100, 116, 139, 0.35)";
	const g = TOOTH14_ROOTS_GEOMETRY;

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* LAYER 0: Deep Palatal Root (Recessed in lingual shadow plane) */}
			<path
				id={sid(`tooth${tNum}-palatal-root`)}
				d={g.palatalRootPath}
				fill={`url(#${sid(`dente-root-palatal-dentin-${tNum}`)})`}
				stroke={palatalStrokeColor}
				strokeWidth="0.65"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* LAYER 1: Foreground Buccal Root Monolith (3D Trunk & Apex at Y=14.0) */}
			<path
				id={sid(`tooth${tNum}-buccal-root-monolith`)}
				d={g.buccalRootMonolithPath}
				fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Cylindrical Volume Shading */}
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={g.buccalRootMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d={g.saddleShadowPath}
					fill={`url(#${sid(isDark ? `dente-saddle-shadow-${tNum}-dark` : `dente-saddle-shadow-${tNum}`)})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* LAYER 2: Longitudinal Developmental Depression (Canine Fossa Continuity) */}
			{showGrooves && (
				<g id={sid(`tooth${tNum}-root-grooves`)} pointerEvents="none">
					<path
						d={g.mesialRadicularGroove}
						fill="none"
						stroke={grooveStroke}
						strokeWidth="0.55"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			)}

			{/* LAYER 3: Cementoenamel Junction (CEJ) */}
			{showCej && (
				<path
					id={sid(`tooth${tNum}-cej`)}
					d={TOOTH14_GEOMETRY.cejCurve}
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
