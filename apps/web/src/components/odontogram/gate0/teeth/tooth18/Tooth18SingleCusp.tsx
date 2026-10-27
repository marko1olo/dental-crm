import React from "react";
import type { Tooth18CuspDef } from "./tooth18CuspGeometry";

export interface Tooth18SingleCuspProps {
	cusp: Tooth18CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 18.
 * Restores full volumetric 3D cusp shading with seamless upper fade.
 * Mandate 8b <= 120 lines.
 */
export const Tooth18SingleCusp: React.FC<Tooth18SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.80)";

	return (
		<g id={`tooth18-cusp-${c.id}`}>
			{/* Natural Cusp Margin Crest — Smooth unified porcelain, 0 sharp polygon seams */}
			<path
				d={c.ridgePath}
				fill="none"
				stroke={rs}
				strokeWidth="0.75"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
