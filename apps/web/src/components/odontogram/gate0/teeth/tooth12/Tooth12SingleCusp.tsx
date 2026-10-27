import React from "react";
import type { Tooth12CuspDef } from "./tooth12CuspGeometry";

export interface Tooth12SingleCuspProps {
	cusp: Tooth12CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical incisal edge & mamelon rendering for Tooth 12 (Wheeler Ch. 7).
 * Sharp 90° mesio-incisal angle, rounded distal angle, silky smooth diffuse volume.
 * Mandate 8b <= 120 lines.
 */
export const Tooth12SingleCusp: React.FC<Tooth12SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)";

	return (
		<g id={`tooth12-cusp-${c.id}`}>
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
