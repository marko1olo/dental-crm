import React from "react";
import { TOOTH18_PULP_GEOMETRY } from "./tooth18PulpGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth18PulpChamberProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
	unified?: boolean | undefined;
}

/**
 * Coronal Pulp Chamber (Cavitas pulparis coronae) for Upper Third Molar Tooth 18.
 * Compact anatomical dome with 2 rounded horns (MB dominant, DB reduced).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18PulpChamber: React.FC<Tooth18PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
	unified = false,
}) => {
	const tNum = useToothNumber() ?? 18;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const p = TOOTH18_PULP_GEOMETRY;
	const isNecrotic = condition === "necrotic";
	const isPulpitis = condition === "pulpitis";
	const isObturated = ["adequate", "underfill", "overfill"].includes(condition);

	const pathD = isObturated
		? p.coronalPulpChamber
		: unified
			? p.unifiedPulpSystemPath
			: p.coronalPulpChamber;

	const chamberFill = isNecrotic
		? `url(#${sid("dente-pulp-necrotic")})`
		: isPulpitis
			? `url(#${sid("dente-pulp-hyperemia")})`
			: isObturated
				? `url(#${sid("dente-pulp-chamber-obturated")})`
				: `url(#${sid("dente-pulp-vital")})`;

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
			id={sid(`tooth${tNum}-pulp-chamber`)}
			data-testid={`tooth${tNum}-pulp-chamber`}
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
			{/* Orifice indicators on pulpal floor when chamber only */}
			{!unified &&
				p.rostrumMap.orifices.map((o) => (
					<circle
						key={o.id}
						cx={o.x}
						cy={o.y}
						r={o.r}
						fill={isObturated ? "#be123c" : "#881337"}
						opacity="0.6"
					/>
				))}
		</g>
	);
};
