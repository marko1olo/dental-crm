import type React from "react";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

/**
 * Dental calculus deposits (supragingival and subgingival) for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CalculusOverlay: React.FC = () => {
	const c = TOOTH46_PATHOLOGY_GEOMETRY.calculus;
	return (
		<g id="tooth46-calculus-deposits" data-testid="tooth46-calculus">
			<path
				d={c.supragingival}
				fill="url(#dente-calculus-supra)"
				stroke="rgba(180, 83, 9, 0.60)"
				strokeWidth="0.55"
				strokeLinejoin="round"
			/>
			{c.nodularTexture.map((n) => (
				<path
					key={`nodule-${n.slice(0, 10)}`}
					d={n}
					data-component="calculus-nodule"
					fill="none"
					stroke="#92400e"
					strokeWidth="0.45"
					strokeOpacity="0.7"
				/>
			))}
			<path
				d={c.subgingival}
				fill="url(#dente-calculus-sub)"
				stroke="#1c1917"
				strokeWidth="0.6"
			/>
		</g>
	);
};
