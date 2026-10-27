import React from "react";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH11_PULP_GEOMETRY } from "./tooth11PulpGeometry";

export interface Tooth11PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Wide coronal pulp chamber with 3 mamelon horns for Tooth 11
 * Mandate 8b <= 120 lines.
 */
export const Tooth11PulpChamber: React.FC<Tooth11PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH11_PULP_GEOMETRY;
	const isNecrotic = condition === "necrotic";
	const isPulpitis = condition === "pulpitis";
	const isObturated = ["adequate", "underfill", "overfill"].includes(condition);

	const chamberFill = isNecrotic
		? "url(#dente-pulp-necrotic)"
		: isPulpitis
			? "url(#dente-pulp-hyperemia)"
			: isObturated
				? "url(#dente-pulp-chamber-obturated)"
				: "url(#dente-pulp-vital)";

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
			id="tooth11-pulp-chamber"
			data-testid="tooth11-pulp-chamber"
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
					strokeWidth="0.8"
					strokeLinecap="round"
					opacity="0.80"
				/>
			))}
		</g>
	);
};
