import React from "react";
import type { Tooth14CuspDef } from "./tooth14CuspGeometry";

export interface Tooth14SingleCuspProps {
	cusp: Tooth14CuspDef;
	isDark?: boolean;
}

const DISTAL_BEVEL_14 =
	"M 51.5,152.0 C 58.0,150.0 68.0,144.0 76.5,135.0 C 72.0,132.0 64.0,135.0 57.0,140.0 C 53.0,144.0 51.8,149.0 51.5,152.0 Z";
const MESIAL_BEVEL_14 =
	"M 51.5,152.0 C 42.0,149.0 32.0,142.0 23.5,133.0 C 27.0,130.0 36.0,134.0 43.0,139.0 C 48.0,144.0 50.5,149.0 51.5,152.0 Z";

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 14.
 * Volumetric 3D organic cusp shading without low-poly origami polygon seams.
 * Mandate 8b <= 120 lines.
 */
export const Tooth14SingleCusp: React.FC<Tooth14SingleCuspProps> = ({
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
		<g id={`tooth14-cusp-${c.id}`}>
			{c.id === "B" && (
				<>
					{/* Organic distal slope ambient shadow (fades to 0% at boundary, 0 seams) */}
					<path d={DISTAL_BEVEL_14} fill={df} vectorEffect="non-scaling-stroke" />
					{/* Organic mesial slope porcelain sheen (fades to 0% at boundary, 0 seams) */}
					<path d={MESIAL_BEVEL_14} fill={mf} vectorEffect="non-scaling-stroke" />
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
