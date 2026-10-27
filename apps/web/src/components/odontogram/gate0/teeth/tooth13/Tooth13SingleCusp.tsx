import React from "react";
import type { Tooth13CuspDef } from "./tooth13CuspGeometry";

export interface Tooth13SingleCuspProps {
	cusp: Tooth13CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical cusp slope & labial ridge for Tooth 13.
 * Eliminates low-poly origami polygons in favor of smooth anatomical enamel.
 * Mandate 8b <= 120 lines.
 */
export const Tooth13SingleCusp: React.FC<Tooth13SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)";

	return (
		<g id={`tooth13-cusp-${c.id}`}>
			{c.labialRidgePath && (
				<path
					d={c.labialRidgePath}
					fill="none"
					stroke="url(#dente-ridge-highlight-13)"
					strokeWidth="0.65"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path
				d={c.ridgePath}
				fill="none"
				stroke={rs}
				strokeWidth="0.80"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
