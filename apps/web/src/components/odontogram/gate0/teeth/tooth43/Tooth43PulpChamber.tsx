import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH43_PULP_GEOMETRY } from "./tooth43PulpGeometry";

export interface Tooth43PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Spear-shaped coronal pulp chamber for Tooth 43 (Mandibular Canine)
 * Mandate 8b <= 120 lines.
 */
export const Tooth43PulpChamber: React.FC<Tooth43PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 43;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const p = TOOTH43_PULP_GEOMETRY;
	const isNecrotic = condition === "necrotic";
	const isPulpitis = condition === "pulpitis";
	const isObturated = ["adequate", "underfill", "overfill"].includes(condition);

	const chamberFill = `url(#${sid(isNecrotic
		? "dente-pulp-necrotic"
		: isPulpitis
			? "dente-pulp-hyperemia"
			: isObturated
				? "dente-pulp-chamber-obturated"
				: "dente-pulp-vital")})`;

	const chamberStroke = isNecrotic
		? "rgba(68, 64, 60, 0.85)"
		: isPulpitis
			? "#ef4444"
			: isObturated
				? isDark
					? "rgba(148, 163, 184, 0.50)"
					: "rgba(180, 150, 120, 0.55)"
				: "rgba(159, 18, 57, 0.70)";

	return (
		<g
			id={sid(`tooth${tNum}-pulp-chamber`)}
			data-testid="tooth43-pulp-chamber"
			opacity={isPulpitis ? "0.95" : "0.85"}
			className={className}
		>
			<path
				d={p.coronalPulpChamber}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
