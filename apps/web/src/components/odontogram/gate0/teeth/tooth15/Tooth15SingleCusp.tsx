import React from "react";
import type { Tooth15CuspDef } from "./tooth15CuspGeometry";

export interface Tooth15SingleCuspProps {
	cusp: Tooth15CuspDef;
	isDark?: boolean;
}

const DISTAL_BEVEL_15 =
	"M 50.0,151.0 C 57.0,149.0 67.0,143.0 75.5,134.0 C 71.0,131.0 63.0,134.0 56.0,139.0 C 52.0,143.0 50.5,148.0 50.0,151.0 Z";
const MESIAL_BEVEL_15 =
	"M 50.0,151.0 C 41.0,148.0 31.0,141.0 24.5,134.0 C 28.0,131.0 37.0,135.0 44.0,140.0 C 48.0,144.0 49.5,148.0 50.0,151.0 Z";

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 15.
 * Volumetric 3D organic cusp shading without low-poly origami polygon seams.
 * Mandate 8b <= 120 lines.
 */
export const Tooth15SingleCusp: React.FC<Tooth15SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const rs = isDark ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.80)";
	const df = isDark
		? "url(#dente-cusp-slope-distal-radial-dark)"
		: "url(#dente-cusp-slope-distal-radial)";
	const mf = isDark
		? "url(#dente-cusp-slope-mesial-radial-dark)"
		: "url(#dente-cusp-slope-mesial-radial)";

	return (
		<g id={`tooth15-cusp-${c.id}`}>
			{c.id === "B" && (
				<>
					{/* Organic distal slope ambient shadow (fades to 0% at boundary, 0 seams) */}
					<path d={DISTAL_BEVEL_15} fill={df} vectorEffect="non-scaling-stroke" />
					{/* Organic mesial slope porcelain sheen (fades to 0% at boundary, 0 seams) */}
					<path d={MESIAL_BEVEL_15} fill={mf} vectorEffect="non-scaling-stroke" />
				</>
			)}
			{/* Natural Cusp Margin Crest — Smooth anatomical ridge line */}
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
