import type React from "react";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH45_PULP_GEOMETRY } from "./tooth45PulpGeometry";

export interface Tooth45PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Wheeler's Dental Anatomy Ch. 11 Coronal Pulp Chamber for Tooth 45
 * 3 Cornua Pulpae (Buccal, ML, DL) & Single Krasner-Rankow Orifice.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth45PulpChamber: React.FC<Tooth45PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH45_PULP_GEOMETRY;
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
	const chamberOpacity = isPulpitis ? "0.95" : isNecrotic ? "0.90" : "0.85";

	return (
		<g
			id="tooth45-pulp-chamber"
			data-testid="tooth45-pulp-chamber"
			opacity={chamberOpacity}
			className={className}
		>
			{/* Cavitas pulparis dome with 3 cornua pulpae (Buccal, ML, DL) */}
			<path
				d={p.coronalPulpChamber}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Pulpal Floor Orifice Collar */}
			<path
				d={p.rostrumMap.grooves}
				fill="none"
				stroke="rgba(30, 41, 59, 0.40)"
				strokeWidth="0.5"
				strokeLinecap="round"
			/>
			{p.rostrumMap.orifices.map((o) => (
				<circle
					key={o.id}
					cx={o.x}
					cy={o.y}
					r={o.r}
					fill="rgba(15, 23, 42, 0.65)"
					stroke="rgba(244, 63, 94, 0.40)"
					strokeWidth="0.3"
				/>
			))}

			{/* Neurovascular Plexus */}
			{!isObturated &&
				p.neuroPlexus.map((np) => (
					<path
						key={np.id}
						d={np.d}
						fill="none"
						stroke="url(#dente-pulp-capillary-tree)"
						strokeWidth="0.5"
						strokeDasharray="2.0 1.0"
						opacity="0.75"
					/>
				))}
		</g>
	);
};
