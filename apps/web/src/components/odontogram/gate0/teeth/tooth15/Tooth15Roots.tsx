import React from "react";
import { TOOTH15_GEOMETRY, TOOTH15_ROOTS_GEOMETRY } from "./tooth15GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

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
	const tNum = useToothNumber() ?? 15;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark ? "#94a3b8" : "rgba(71, 85, 105, 0.45)";
	const grooveStroke = isDark ? "rgba(148, 163, 184, 0.30)" : "rgba(100, 116, 139, 0.10)";
	const g = TOOTH15_ROOTS_GEOMETRY;

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* Single Conical Root Monolith */}
			<path
				id={sid(`tooth${tNum}-root-monolith`)}
				d={g.rootMonolithPath}
				fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={g.rootMonolithPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* Longitudinal Developmental Depressions */}
			{showGrooves && (
				<>
					<path id={sid(`tooth${tNum}-mesial-groove`)} d={g.mesialRadicularGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
					<path id={sid(`tooth${tNum}-distal-groove`)} d={g.distalRadicularGroove} fill="none" stroke={grooveStroke} strokeWidth="0.40" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
				</>
			)}

			{/* Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id={sid(`tooth${tNum}-cej`)}
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
