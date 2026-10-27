import React from "react";
import { TOOTH17_PERIAPICAL_GEOMETRY } from "./tooth17PeriapicalGeometry";

export interface Tooth17PeriapicalAreaProps {
	condition?: string | undefined;
	apexId?: "all" | "P" | "MB" | "DB" | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Periapical inflammatory defect overlay across 3 maxillary molar apices (P, MB, DB).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth17PeriapicalArea: React.FC<Tooth17PeriapicalAreaProps> = ({
	condition = "none",
	apexId = "all",
	isDark = false,
	className,
}) => {
	if (condition === "none") return null;

	const g = TOOTH17_PERIAPICAL_GEOMETRY;
	const isCyst = condition === "cyst";
	const rimStroke = isDark ? "#ffffff" : "#f1f5f9";
	const haloStroke = isDark ? "rgba(239, 68, 68, 0.40)" : "rgba(220, 38, 38, 0.35)";

	const showP = apexId === "all" || apexId === "P";
	const showMB = apexId === "all" || apexId === "MB";
	const showDB = apexId === "all" || apexId === "DB";

	if (isCyst) {
		return (
			<g id="tooth17-periapical-cyst" className={className}>
				{showP && (
					<>
						<path d={g.radicularCyst.palatal.lumen} fill="url(#dente-cyst-fluid)" />
						<path d={g.radicularCyst.palatal.corticalRim} fill="none" stroke={rimStroke} strokeWidth="1.2" />
					</>
				)}
				{showMB && (
					<>
						<path d={g.radicularCyst.mb.lumen} fill="url(#dente-cyst-fluid)" />
						<path d={g.radicularCyst.mb.corticalRim} fill="none" stroke={rimStroke} strokeWidth="1.2" />
					</>
				)}
			</g>
		);
	}

	return (
		<g id="tooth17-periapical-granuloma" className={className}>
			{showP && (
				<>
					<path d={g.granuloma.palatal.capsuleRim} fill={haloStroke} />
					<path d={g.granuloma.palatal.core} fill="url(#dente-cyst-fluid)" stroke="rgba(239,68,68,0.6)" strokeWidth="0.6" />
				</>
			)}
			{showMB && (
				<>
					<path d={g.granuloma.mb.capsuleRim} fill={haloStroke} />
					<path d={g.granuloma.mb.core} fill="url(#dente-cyst-fluid)" stroke="rgba(239,68,68,0.6)" strokeWidth="0.6" />
				</>
			)}
			{showDB && (
				<>
					<path d={g.granuloma.db.capsuleRim} fill={haloStroke} />
					<path d={g.granuloma.db.core} fill="url(#dente-cyst-fluid)" stroke="rgba(239,68,68,0.6)" strokeWidth="0.6" />
				</>
			)}
		</g>
	);
};
