import type React from "react";
import { TOOTH46_PERIAPICAL_GEOMETRY } from "./Tooth46PeriapicalGeometry";

export interface Tooth46ResorptionOverlayProps {
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Apical root resorption overlay for Tooth 46.
 * Renders blunted, shortened root apex with scalloped Howship's lacunae.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46ResorptionOverlay: React.FC<
	Tooth46ResorptionOverlayProps
> = ({ isDark = false, className }) => {
	const r = TOOTH46_PERIAPICAL_GEOMETRY.resorption;
	const lacunaeStroke = isDark
		? "rgba(248, 113, 113, 0.95)"
		: "rgba(220, 38, 38, 0.90)";

	return (
		<g
			id="tooth46-apical-resorption"
			data-testid="tooth46-resorption"
			className={className}
		>
			{/* Periapical Osteolytic Resorption Field */}
			<path
				d={r.resorptionHalo}
				fill="url(#dente-resorption-halo)"
				stroke="none"
			/>
			{/* Blunted Concave Crater Horizon */}
			<path
				d={r.bluntedApexCrater}
				fill="#1e1b18"
				stroke={lacunaeStroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Scalloped Crenulated Howship's Lacunae */}
			{r.howshipLacunae.map((lacuna) => (
				<path
					key={`lacuna-${lacuna.slice(0, 12)}`}
					d={lacuna}
					fill="none"
					stroke={lacunaeStroke}
					strokeWidth="0.6"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</g>
	);
};
