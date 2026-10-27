import React from "react";
import { TOOTH12_PERIAPICAL_GEOMETRY } from "./tooth12PeriapicalGeometry";

export interface Tooth12PeriapicalAreaProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical Pathology Area for Upper Lateral Incisor 12.
 * Renders radicular cyst or apical granuloma at curved apex (Y=14.0).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12PeriapicalArea: React.FC<Tooth12PeriapicalAreaProps> = ({
	condition,
	isDark = false,
	className,
}) => {
	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH12_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id="tooth12-periapical-area" {...(className ? { className } : {})}>
			{isCyst && (
				<g id="tooth12-radicular-cyst">
					<path
						d={p.radicularCyst.lateral.corticalRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.radicularCyst.lateral.lumen}
						fill="url(#dente-periapical-cyst-12)"
					/>
				</g>
			)}

			{isGranuloma && (
				<g id="tooth12-apical-granuloma">
					<path
						d={p.granuloma.lateral.capsuleRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.6"
						strokeDasharray="1.2 0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.granuloma.lateral.core}
						fill="url(#dente-granuloma-core)"
					/>
				</g>
			)}
		</g>
	);
};
