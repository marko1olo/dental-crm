import React from "react";
import { TOOTH14_PERIAPICAL_GEOMETRY } from "./tooth14PeriapicalGeometry";

export interface Tooth14PeriapicalAreaProps {
	condition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical Pathology Area for Upper First Premolar Tooth 14.
 * Renders radicular cyst or apical granuloma at Buccal and Palatal apices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14PeriapicalArea: React.FC<Tooth14PeriapicalAreaProps> = ({
	condition,
	isDark = false,
	className,
}) => {
	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH14_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id="tooth14-periapical-area" {...(className ? { className } : {})}>
			{isCyst && (
				<g id="tooth14-radicular-cyst">
					{/* Buccal Apex Cyst */}
					<path d={p.radicularCyst.buccal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.radicularCyst.buccal.lumen} fill="url(#dente-periapical-cyst-14)" />
					{/* Palatal Apex Cyst */}
					<path d={p.radicularCyst.palatal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.radicularCyst.palatal.lumen} fill="url(#dente-periapical-cyst-14)" />
				</g>
			)}

			{isGranuloma && (
				<g id="tooth14-apical-granuloma">
					{/* Buccal Apex Granuloma */}
					<path d={p.granuloma.buccal.capsuleRim} fill="none" stroke={rimStroke} strokeWidth="0.6" strokeDasharray="1.2 0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.granuloma.buccal.core} fill="url(#dente-granuloma-core)" />
					{/* Palatal Apex Granuloma */}
					<path d={p.granuloma.palatal.capsuleRim} fill="none" stroke={rimStroke} strokeWidth="0.6" strokeDasharray="1.2 0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.granuloma.palatal.core} fill="url(#dente-granuloma-core)" />
				</g>
			)}
		</g>
	);
};
