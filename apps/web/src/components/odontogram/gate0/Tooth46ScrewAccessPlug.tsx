import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "./OdontogramSharedDefsContext";
import { TOOTH46_PATHOLOGY_GEOMETRY } from "./Tooth46PathologyGeometry";

export interface Tooth46ScrewAccessPlugProps {
	className?: string | undefined;
}

/**
 * Occlusal screw access hole plug sealed with nanohybrid composite
 * Mandate 8b <= 120 lines.
 */
export const Tooth46ScrewAccessPlug: React.FC<Tooth46ScrewAccessPlugProps> = ({
	className,
}) => {
	const tNum = useToothNumber() ?? 46;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const s = TOOTH46_PATHOLOGY_GEOMETRY.implant.screwAccessHole;

	return (
		<g
			id={sid(`tooth${tNum}-screw-access-plug`)}
			data-component="implant-screw-access"
			className={className}
		>
			<path d={s.outerRim} fill="#cbd5e1" stroke="#475569" strokeWidth="0.75" />
			<path
				d={s.compositePlug}
				fill={`url(#${sid("dente-composite-body")})`}
				stroke="#94a3b8"
				strokeWidth="0.5"
			/>
			<path d={s.hexScrewGhost} fill="#0f172a" opacity="0.55" />
			<path d={s.plugMargin} fill="none" stroke="#64748b" strokeWidth="0.5" />
		</g>
	);
};
