import React from "react";
import type { Tooth11CuspDef } from "./tooth11CuspGeometry";

export interface Tooth11SingleCuspProps {
	cusp: Tooth11CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical incisal edge & mamelon rendering for Tooth 11 (Wheeler Ch. 6).
 * Sharp 90° mesio-incisal midline corner, delicate distal corner, silky smooth diffuse volume.
 * Mandate 8b <= 120 lines.
 */
export const Tooth11SingleCusp: React.FC<Tooth11SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)";

	return (
		<g id={`tooth11-cusp-${c.id}`}>
			{/* Unified silky porcelain face — Zero origami facets, zero artificial center lines */}
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
