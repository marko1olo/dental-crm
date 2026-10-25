import type React from "react";
import { TOOTH46_CARIES_GEOMETRY } from "./Tooth46CariesGeometry";

export interface Tooth46CariesClass1Props {
	lesionFill: string;
	necroticFill: string;
	haloStroke: string;
	isDark?: boolean;
	showBuccalPit?: boolean;
}

/**
 * Class I Fissure Caries & Foramen Caecum lesion
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CariesClass1: React.FC<Tooth46CariesClass1Props> = ({
	lesionFill,
	necroticFill,
	haloStroke,
	isDark = false,
	showBuccalPit = true,
}) => {
	const c1 = TOOTH46_CARIES_GEOMETRY;

	return (
		<g id="tooth46-caries-class1">
			<path
				d={c1.demineralizedHalo}
				fill="url(#dente-caries-demin)"
				stroke={haloStroke}
				strokeWidth="0.6"
			/>
			<path
				d={c1.dendriticCariesPath}
				fill={lesionFill}
				stroke="rgba(120, 53, 15, 0.85)"
				strokeWidth="0.6"
			/>
			<path
				d={c1.necroticCore}
				fill={necroticFill}
				stroke="rgba(28, 25, 23, 0.95)"
				strokeWidth="0.6"
			/>
			<path
				d={c1.buccalGrooveTrace}
				fill="none"
				stroke={isDark ? "rgba(120, 53, 15, 0.50)" : "rgba(146, 64, 14, 0.60)"}
				strokeWidth="0.7"
				strokeLinecap="round"
			/>
			{showBuccalPit && (
				<g id="tooth46-buccal-caecum">
					<path
						d={c1.buccalPitCavity.halo}
						fill="url(#dente-caries-demin)"
						stroke={haloStroke}
						strokeWidth="0.5"
					/>
					<path
						d={c1.buccalPitCavity.crater}
						fill={lesionFill}
						stroke="rgba(120, 53, 15, 0.8)"
						strokeWidth="0.5"
					/>
					<path
						d={c1.buccalPitCavity.necroticCenter}
						fill={necroticFill}
						stroke="#1c1917"
						strokeWidth="0.4"
					/>
				</g>
			)}
		</g>
	);
};
