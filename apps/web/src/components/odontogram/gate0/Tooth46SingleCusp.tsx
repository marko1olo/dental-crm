import React from "react";
import type { Tooth46CuspDef } from "./tooth46CuspGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";

export interface ToothCuspDef {
	id: string;
	nameRu?: string | undefined;
	apex: { x: number; y: number };
	ridgePath: string;
	mesialSlope: string;
	distalSlope: string;
	buccalRidgePath?: string | undefined;
	buccalMesialSlope?: string | undefined;
	buccalDistalSlope?: string | undefined;
}

export interface Tooth46SingleCuspProps {
	cusp: Tooth46CuspDef | ToothCuspDef;
	isDark?: boolean | undefined;
	toothNumber?: number | undefined;
}

/**
 * Individual anatomical cusp slope & ridge rendering for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46SingleCusp: React.FC<Tooth46SingleCuspProps> = ({
	cusp: c,
	isDark = false,
	toothNumber,
}) => {
	const resolvedToothNumber = useToothNumber(toothNumber);
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const cuspPrefix = resolvedToothNumber !== undefined ? `tooth${resolvedToothNumber}-` : "";
	const lf = `url(#${sid(isDark ? "dente-cusp-slope-light-dark" : "dente-cusp-slope-light")})`;
	const sf = `url(#${sid(isDark ? "dente-cusp-slope-shadow-dark" : "dente-cusp-slope-shadow")})`;
	const blf = `url(#${sid(isDark ? "dente-buccal-lobe-light-dark" : "dente-buccal-lobe-light")})`;
	const bsf = `url(#${sid(isDark ? "dente-buccal-lobe-shadow-dark" : "dente-buccal-lobe-shadow")})`;
	const rs = isDark ? "rgba(241, 245, 249, 0.65)" : "rgba(255, 255, 255, 0.80)";

	return (
		<g id={sid(`${cuspPrefix}cusp-${c.id}`)}>
			{c.buccalMesialSlope && <path d={c.buccalMesialSlope} fill={blf} />}
			{c.buccalDistalSlope && <path d={c.buccalDistalSlope} fill={bsf} />}
			{c.buccalRidgePath && (
				<path
					d={c.buccalRidgePath}
					fill="none"
					stroke={`url(#${sid("dente-ridge-highlight")})`}
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
