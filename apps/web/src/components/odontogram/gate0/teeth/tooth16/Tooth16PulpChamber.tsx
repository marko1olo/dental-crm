import React from "react";
import { TOOTH16_PULP_GEOMETRY } from "./tooth16PulpGeometry";

export interface Tooth16PulpChamberProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
	unified?: boolean | undefined;
}

/**
 * Coronal Pulp Chamber (Cavitas pulparis coronae) for Maxillary First Molar Tooth 16.
 * Compact anatomical dome (X=34..65, Y=96..130) with 4 delicate cornua pulpae.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth16PulpChamber: React.FC<Tooth16PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
	unified = false,
}) => {
	const p = TOOTH16_PULP_GEOMETRY;
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
			id="tooth16-pulp-chamber"
			data-testid="tooth16-pulp-chamber"
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
