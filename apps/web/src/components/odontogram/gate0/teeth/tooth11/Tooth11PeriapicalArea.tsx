import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
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
	const tNum = useToothNumber() ?? 11;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	if (!condition || condition === "intact" || condition === "normal") return null;

	const p = TOOTH11_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst" || condition === "radicular_cyst";
	const isGranuloma = condition === "granuloma" || condition === "periodontitis_chronic";

	if (!isCyst && !isGranuloma) return null;

	const rimStroke = isDark ? "rgba(248, 250, 252, 0.85)" : "rgba(15, 23, 42, 0.75)";

	return (
		<g id={sid(`tooth${tNum}-periapical-area`)} {...(className ? { className } : {})}>
			{isCyst && (
				<g id={sid(`tooth${tNum}-radicular-cyst`)}>
					<path
						d={p.radicularCyst.central.corticalRim}
						fill="none"
						stroke={rimStroke}
						strokeWidth="0.8"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={p.radicularCyst.central.lumen}
						fill={`url(#${sid(`dente-periapical-cyst-${tNum}`)})`}
					/>
				</g>
			)}

			{isGranuloma && (
				<g id={sid(`tooth${tNum}-apical-granuloma`)}>
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
						fill={`url(#${sid("dente-granuloma-core")})`}
					/>
				</g>
			)}
		</g>
	);
};
