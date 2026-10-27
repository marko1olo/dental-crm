import React from "react";
import { TOOTH11_PERIAPICAL_GEOMETRY } from "./tooth11PeriapicalGeometry";

export interface Tooth11PeriapicalAreaProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical Pathology Area for Upper Central Incisor 11.
 * Renders radicular cyst or apical granuloma at centered apex (Y=12.5).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11PeriapicalArea: React.FC<Tooth11PeriapicalAreaProps> = ({
	condition,
	isDark = false,
	className,
}) => {
	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH11_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id="tooth11-periapical-area" {...(className ? { className } : {})}>
			{isCyst && (
				<g id="tooth11-radicular-cyst">
					<path
						d={p.radicularCyst.central.corticalRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.radicularCyst.central.lumen}
						fill="url(#dente-periapical-cyst-11)"
					/>
				</g>
			)}

			{isGranuloma && (
				<g id="tooth11-apical-granuloma">
					<path
						d={p.granuloma.central.capsuleRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.6"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.granuloma.central.core}
						fill="url(#dente-granuloma-core)"
					/>
				</g>
			)}
		</g>
	);
};
