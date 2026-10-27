import React from "react";
import { TOOTH15_PERIAPICAL_GEOMETRY } from "./tooth15PeriapicalGeometry";

export interface Tooth15PeriapicalAreaProps {
	condition?: string | undefined;
	apexId?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical inflammatory defect overlay on single apex of Upper Second Premolar 15.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth15PeriapicalArea: React.FC<Tooth15PeriapicalAreaProps> = ({
	condition = "none",
	isDark = false,
	className,
}) => {
	if (condition === "none") return null;

	const g = TOOTH15_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst";
	const rimStroke = isDark ? "#ffffff" : "#f1f5f9";
	const haloStroke = isDark ? "rgba(239, 68, 68, 0.40)" : "rgba(220, 38, 38, 0.35)";

	if (isCyst) {
		return (
			<g id="tooth15-periapical-cyst" className={className}>
				<path d={g.radicularCyst.palatal.lumen} fill="url(#dente-cyst-fluid)" />
				<path d={g.radicularCyst.palatal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="1.2" />
			</g>
		);
	}

	return (
		<g id="tooth15-periapical-granuloma" className={className}>
			<path d={g.granuloma.palatal.capsuleRim} fill={haloStroke} />
			<path d={g.granuloma.palatal.core} fill="url(#dente-cyst-fluid)" stroke="rgba(239,68,68,0.6)" strokeWidth="0.6" />
		</g>
	);
};
