import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
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
	const tNum = useToothNumber() ?? 11;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark ? "#94a3b8" : "rgba(71, 85, 105, 0.45)";
	const grooveStroke = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.16)";
	const cejStroke = isDark ? "#cbd5e1" : "rgba(100, 116, 139, 0.35)";
	const g = TOOTH11_ROOTS_GEOMETRY;

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* LAYER 1: Straight Conical Root Monolith (Apex Y=12.5) */}
			<path
				id={sid(`tooth${tNum}-root-monolith`)}
				d={g.rootMonolithPath}
				fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Cylindrical Volume Shading (Pure shader depth, zero artificial white strokes) */}
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={g.rootMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
				/>
			</g>

			{/* LAYER 2: Subtle Longitudinal Developmental Grooves */}
			{showGrooves && (
				<g id={sid(`tooth${tNum}-root-grooves`)} pointerEvents="none">
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
					id={sid(`tooth${tNum}-cej`)}
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
