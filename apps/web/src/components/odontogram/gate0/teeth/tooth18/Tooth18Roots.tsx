import React from "react";
import { TOOTH18_GEOMETRY, TOOTH18_ROOTS_GEOMETRY } from "./tooth18GeometryConstants";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth18RootsProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	isEndo?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Anatomical Fused Conical Roots for Upper Third Molar 18 (Wheeler Ch. 12).
 * Monolithic fused root trunk with sharp distal hook, 3 lobes defined by deep fusion grooves.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18Roots: React.FC<Tooth18RootsProps> = ({
	showCej = true,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 18;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const strokeColor = isDark ? "#94a3b8" : "rgba(71, 85, 105, 0.45)";
	const g = TOOTH18_ROOTS_GEOMETRY;

	return (
		<g id={sid(`tooth${tNum}-roots`)} {...(className ? { className } : {})}>
			{/* LAYER 1: Fused Conical Root Monolith (Zero through-hole window) */}
			<path
				id={sid(`tooth${tNum}-roots-fused`)}
				d={g.fusedConicalRootPath}
				fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`}
				stroke={strokeColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<g clipPath={`url(#${sid(`tooth${tNum}-root-clip`)})`}>
				<path
					d={g.fusedConicalRootPath}
					fill={`url(#${sid(isDark ? "dente-root-contour-dark" : "dente-root-contour")})`}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
			</g>

			{/* LAYER 3: Cementoenamel Junction (CEJ) Cervical Curvature */}
			{showCej && (
				<path
					id={sid(`tooth${tNum}-cej`)}
					d={TOOTH18_GEOMETRY.cejCurve}
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
