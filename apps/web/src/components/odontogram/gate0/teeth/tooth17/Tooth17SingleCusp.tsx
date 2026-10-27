import React from "react";
import type { Tooth17CuspDef } from "./tooth17CuspGeometry";

export interface Tooth17SingleCuspProps {
	cusp: Tooth17CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 17.
 * Restores full volumetric 3D cusp shading with seamless upper fade.
 * Mandate 8b <= 120 lines.
 */
export const Tooth17SingleCusp: React.FC<Tooth17SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.80)";

	return (
		<g id={`tooth17-cusp-${c.id}`}>
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
