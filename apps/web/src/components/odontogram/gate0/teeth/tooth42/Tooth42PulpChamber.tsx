import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH42_PULP_GEOMETRY } from "./tooth42PulpGeometry";

export interface Tooth42PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Chisel-shaped coronal pulp chamber for Tooth 42 (Mandibular Lateral Incisor)
 * Mandate 8b <= 120 lines.
 */
export const Tooth42PulpChamber: React.FC<Tooth42PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 42;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const p = TOOTH42_PULP_GEOMETRY;
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
			data-testid="tooth42-pulp-chamber"
			opacity={isPulpitis ? "0.95" : "0.85"}
			className={className}
		>
			<path
				d={p.coronalPulpChamber}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.75"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Neurovascular Trunk */}
			{p.neuroPlexus.map((n) => (
				<path
					key={n.id}
					d={n.d}
					fill="none"
					stroke={isNecrotic ? "#78716c" : isPulpitis ? "#b91c1c" : "#e11d48"}
					strokeWidth="0.85"
					strokeLinecap="round"
					opacity="0.80"
				/>
			))}
		</g>
	);
};
