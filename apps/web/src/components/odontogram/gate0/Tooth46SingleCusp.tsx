import type React from "react";
import type { Tooth46CuspDef } from "./tooth46CuspGeometry";

export interface Tooth46SingleCuspProps {
	cusp: Tooth46CuspDef;
	isDark?: boolean;
}

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46SingleCusp: React.FC<Tooth46SingleCuspProps> = ({
	cusp: c,
	isDark = false,
}) => {
	const lf = isDark
		? "url(#dente-cusp-slope-light-dark)"
		: "url(#dente-cusp-slope-light)";
	const sf = isDark
		? "url(#dente-cusp-slope-shadow-dark)"
		: "url(#dente-cusp-slope-shadow)";
	const blf = isDark
		? "url(#dente-buccal-lobe-light-dark)"
		: "url(#dente-buccal-lobe-light)";
	const bsf = isDark
		? "url(#dente-buccal-lobe-shadow-dark)"
		: "url(#dente-buccal-lobe-shadow)";
	const rs = isDark ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.80)";

	return (
		<g id={`cusp-${c.id}`}>
			{c.buccalMesialSlope && <path d={c.buccalMesialSlope} fill={blf} />}
			{c.buccalDistalSlope && <path d={c.buccalDistalSlope} fill={bsf} />}
			{c.buccalRidgePath && (
				<path
					d={c.buccalRidgePath}
					fill="none"
					stroke="url(#dente-ridge-highlight)"
					strokeWidth="0.4"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path d={c.mesialSlope} fill={lf} />
			<path d={c.distalSlope} fill={sf} />
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
