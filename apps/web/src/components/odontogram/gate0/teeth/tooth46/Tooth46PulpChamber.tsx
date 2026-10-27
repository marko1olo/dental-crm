import React from "react";
import { TOOTH46_PULP_GEOMETRY } from "./Tooth46PulpGeometry";
import type { CanalCondition } from "../../tooth46Types";

export interface Tooth46PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
	unified?: boolean | undefined;
}

/**
 * Wheeler's Dental Anatomy Ch. 11 Coronal Pulp Chamber (Cavitas pulparis coronae).
 * Seamless anatomical continuity connecting coronal chamber horns to radicular apices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46PulpChamber: React.FC<Tooth46PulpChamberProps> = ({
	condition = "vital",
	isDark = false,
	className,
	unified = false,
}) => {
	const p = TOOTH46_PULP_GEOMETRY;
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
			id="tooth46-pulp-chamber"
			data-testid="tooth46-pulp-chamber"
			opacity={chamberOpacity}
			className={className}
		>
			{/* Cavitas pulparis dome with 2 anatomical rounded cornua pulpae & root canals */}
			<path
				d={pathD}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Krasner & Rankow (2004) Dark Pulpal Floor Rostrum & Fusion Lines */}
			<path
				d={p.rostrumMap.grooves}
				fill="none"
				stroke={
					isNecrotic
						? "rgba(28, 25, 23, 0.90)"
						: isPulpitis
							? "rgba(153, 27, 27, 0.80)"
							: isObturated
								? "rgba(180, 150, 120, 0.45)"
								: "rgba(136, 19, 55, 0.65)"
				}
				strokeWidth="0.7"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Raschkow Neurovascular Capillary Plexus Strands */}
			{!isNecrotic &&
				!isObturated &&
				p.neuroPlexus.map((strand) => (
					<path
						key={`plexus-${strand.id}`}
						id={`plexus-${strand.id}`}
						d={strand.d}
						fill="none"
						stroke={
							isPulpitis
								? "rgba(254, 205, 211, 0.70)"
								: "rgba(254, 205, 211, 0.40)"
						}
						strokeWidth={isPulpitis ? "0.6" : "0.45"}
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				))}
		</g>
	);
};
