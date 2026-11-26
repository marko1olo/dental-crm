import React from "react";
import { TOOTH14_PERIAPICAL_GEOMETRY } from "./tooth14PeriapicalGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

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
	const tNum = useToothNumber() ?? 14;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);

	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH14_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id={sid(`tooth${tNum}-periapical-area`)} {...(className ? { className } : {})}>
			{isCyst && (
				<g id={sid(`tooth${tNum}-radicular-cyst`)}>
					{/* Buccal Apex Cyst */}
					<path d={p.radicularCyst.buccal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.radicularCyst.buccal.lumen} fill={`url(#${sid(`dente-periapical-cyst-${tNum}`)})`} />
					{/* Palatal Apex Cyst */}
					<path d={p.radicularCyst.palatal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.radicularCyst.palatal.lumen} fill={`url(#${sid(`dente-periapical-cyst-${tNum}`)})`} />
				</g>
			)}

			{isGranuloma && (
				<g id={sid(`tooth${tNum}-apical-granuloma`)}>
					{/* Buccal Apex Granuloma */}
					<path d={p.granuloma.buccal.capsuleRim} fill="none" stroke={rimStroke} strokeWidth="0.6" strokeDasharray="1.2 0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.granuloma.buccal.core} fill={`url(#${sid("dente-granuloma-core")})`} />
					{/* Palatal Apex Granuloma */}
					<path d={p.granuloma.palatal.capsuleRim} fill="none" stroke={rimStroke} strokeWidth="0.6" strokeDasharray="1.2 0.8" vectorEffect="non-scaling-stroke" />
					<path d={p.granuloma.palatal.core} fill={`url(#${sid("dente-granuloma-core")})`} />
				</g>
			)}
		</g>
	);
};
