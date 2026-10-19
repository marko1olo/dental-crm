import type React from "react";
import { TOOTH46_PULP_GEOMETRY } from "./Tooth46PulpGeometry";
import type { CanalCondition } from "./tooth46Types";

export interface Tooth46PulpChamberProps {
	condition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Wheeler's Dental Anatomy Ch. 11 Coronal Pulp Chamber (Cavitas pulparis coronae).
 * - Tegmen cavi at Y=42..46 (lower half of crown, under >= 2.5mm occlusal dentin)
 * - 5 slender pulp horns (ML Y=26, MB Y=32, DB Y=34, DL Y=29, D Y=36)
 * - Fundus cavi convex over furcation at Y=69..72 with 3 funnel orifices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46PulpChamber: React.FC<Tooth46PulpChamberProps> = ({
	condition = "vital",
	className,
}) => {
	const p = TOOTH46_PULP_GEOMETRY;

	const isNecrotic = condition === "necrotic";
	const isPulpitis = condition === "pulpitis";
	const isObturated =
		condition === "adequate" ||
		condition === "underfill" ||
		condition === "overfill";

	const chamberFill = isNecrotic
		? "url(#dente-pulp-necrotic)"
		: isObturated
			? "url(#dente-guttapercha-cone)"
			: "url(#dente-pulp-vital)";

	const chamberStroke = isNecrotic
		? "rgba(87, 83, 78, 0.70)"
		: isPulpitis
			? "rgba(244, 63, 94, 0.90)"
			: "rgba(159, 18, 57, 0.60)";

	const chamberOpacity = isPulpitis ? "0.92" : isNecrotic ? "0.85" : "0.75";

	return (
		<g
			id="tooth46-pulp-chamber"
			data-testid="tooth46-pulp-chamber"
			opacity={chamberOpacity}
			className={className}
		>
			{/* Cavitas pulparis dome with 5 slender cornua pulpae */}
			<path
				d={p.coronalPulpChamber}
				fill={chamberFill}
				stroke={chamberStroke}
				strokeWidth="0.75"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Neurovascular Capillary Plexus Strands */}
			{!isNecrotic &&
				!isObturated &&
				p.neuroPlexus.map((strand) => (
					<path
						key={`plexus-${strand.id}`}
						d={strand.d}
						fill="none"
						stroke={
							isPulpitis
								? "rgba(254, 205, 211, 0.50)"
								: "rgba(254, 205, 211, 0.35)"
						}
						strokeWidth="0.5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				))}
		</g>
	);
};
