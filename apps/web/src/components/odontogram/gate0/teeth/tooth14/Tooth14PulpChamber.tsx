import React from "react";
import { TOOTH14_PULP_GEOMETRY } from "./tooth14PulpGeometry";

export interface Tooth14PulpChamberProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
	unified?: boolean | undefined;
}

/**
 * Coronal Pulp Chamber (Cavitas pulparis coronae) for Upper First Premolar Tooth 14.
 * Wheeler Ch. 9: Wide coronal chamber with 2 pulp horns (buccal dominant, palatal smaller)
 * and bifurcating pulpal floor leading to B and P orifices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14PulpChamber: React.FC<Tooth14PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
	unified = false,
}) => {
	const p = TOOTH14_PULP_GEOMETRY;
	const isNecrotic = condition === "necrotic";
	const isPulpitis = condition === "pulpitis";
	const isObturated = ["adequate", "underfill", "overfill"].includes(condition);

	const pathD = isObturated
		? p.coronalPulpChamber
		: unified
			? p.unifiedPulpSystemPath
			: p.coronalPulpChamber;

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

	const chamberOpacity = isPulpitis ? "0.95" : isNecrotic ? "0.90" : "0.85";

	return (
		<g
			id="tooth14-pulp-chamber"
			data-testid="tooth14-pulp-chamber"
			opacity={chamberOpacity}
			{...(className ? { className } : {})}
		>
			<path
				d={pathD}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.75"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{!unified &&
				p.rostrumMap.orifices.map((o) => (
					<circle
						key={o.id}
						cx={o.x}
						cy={o.y}
						r={o.r}
						fill={isObturated ? "#be123c" : "#881337"}
						stroke={isObturated ? "#881337" : "#4c0519"}
						strokeWidth="0.4"
					/>
				))}
		</g>
	);
};
