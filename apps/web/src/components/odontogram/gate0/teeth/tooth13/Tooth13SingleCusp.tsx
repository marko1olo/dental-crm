import React from "react";
import type { Tooth13CuspDef } from "./tooth13CuspGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth13SingleCuspProps {
	cusp: Tooth13CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical cusp slope & labial ridge for Tooth 13 (Wheeler Ch. 8).
 * Spear-shaped canine cusp with soft diffuse slopes & crisp labial ridge crest.
 * Mandate 8b <= 120 lines.
 */
export const Tooth13SingleCusp: React.FC<Tooth13SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const tNum = useToothNumber() ?? 13;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const rs = isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(255, 255, 255, 0.70)";

	return (
		<g id={sid(`tooth${tNum}-cusp-${c.id}`)}>
			{/* Spear-shaped canine labial ridge — Natural organic roundness matching Tooth 43 */}
			{c.labialRidgePath && (
				<path
					d={c.labialRidgePath}
					fill="none"
					stroke={`url(#${sid(`dente-ridge-highlight-${tNum}`)})`}
					strokeWidth="0.45"
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
