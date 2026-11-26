import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

/**
 * Dental calculus deposits (supragingival and subgingival) for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CalculusOverlay: React.FC = () => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const c = TOOTH46_PATHOLOGY_GEOMETRY.calculus;
	return (
		<g id={sid(`tooth${tNum}-calculus-deposits`)} data-testid="tooth46-calculus">
			<path
				d={c.supragingival}
				fill={`url(#${sid("dente-calculus-supra")})`}
				stroke="rgba(140, 111, 68, 0.75)"
				strokeWidth="0.5"
				strokeLinejoin="round"
			/>
			{c.nodularTexture.map((n) => (
				<path
					key={`nodule-${n.slice(0, 10)}`}
					d={n}
					data-component="calculus-nodule"
					fill="none"
					stroke="#6b4c27"
					strokeWidth="0.45"
					strokeOpacity="0.65"
				/>
			))}
			<path
				d={c.subgingival}
				fill={`url(#${sid("dente-calculus-sub")})`}
				stroke="#2e1f10"
				strokeWidth="0.5"
				strokeLinejoin="round"
			/>
		</g>
	);
};
