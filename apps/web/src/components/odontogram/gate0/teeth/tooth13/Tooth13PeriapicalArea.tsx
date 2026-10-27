import React from "react";
import { TOOTH13_PERIAPICAL_GEOMETRY } from "./tooth13PeriapicalGeometry";

export interface Tooth13PeriapicalAreaProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical Pathology Area for Upper Canine Tooth 13.
 * Renders radicular cyst or apical granuloma at high canine apex (Y=4.5).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13PeriapicalArea: React.FC<Tooth13PeriapicalAreaProps> = ({
	condition,
	isDark = false,
	className,
}) => {
	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH13_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id="tooth13-periapical-area" {...(className ? { className } : {})}>
			{isCyst && (
				<g id="tooth13-radicular-cyst">
					<path
						d={p.radicularCyst.canine.corticalRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.radicularCyst.canine.lumen}
						fill="url(#dente-periapical-cyst-13)"
					/>
				</g>
			)}

			{isGranuloma && (
				<g id="tooth13-apical-granuloma">
					<path
						d={p.granuloma.canine.capsuleRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.6"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.granuloma.canine.core}
						fill="url(#dente-granuloma-core)"
					/>
				</g>
			)}
		</g>
	);
};
