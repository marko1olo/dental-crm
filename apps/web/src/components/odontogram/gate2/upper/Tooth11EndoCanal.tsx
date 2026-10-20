import type React from "react";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11EndoCanalProps {
	showPulp?: boolean | undefined;
	showCanal?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Central Incisor (FDI 11) Endo Canal Component
 * Single wide conical canal with 1.5px overlap into pulpal floor.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth11EndoCanal: React.FC<Tooth11EndoCanalProps> = ({
	showPulp = true,
	showCanal = true,
	showGuttaPercha = false,
	isDark = false,
}) => {
	const c = TOOTH11_GEOMETRY.canal;

	return (
		<g id="tooth11-endo-group">
			{showCanal && !showGuttaPercha && (
				<path
					id="tooth11-root-canal"
					d={c.canalPath}
					fill="url(#dente-endo-canal-lumen)"
					stroke="rgba(239, 68, 68, 0.55)"
					strokeWidth="0.6"
				/>
			)}
			{showGuttaPercha && (
				<g id="tooth11-guttapercha-group">
					<path
						id="tooth11-guttapercha-cone"
						d={c.guttaPerchaPath}
						fill="url(#dente-guttapercha-dense)"
						stroke="rgba(249, 115, 22, 0.75)"
						strokeWidth="0.6"
					/>
					<circle
						id="tooth11-apical-stop"
						cx={c.apexPoint.x}
						cy={c.apexPoint.y}
						r="1.4"
						fill="#ea580c"
						stroke="#fff"
						strokeWidth="0.4"
					/>
				</g>
			)}
			{showPulp && (
				<path
					id="tooth11-pulp-chamber"
					d={c.pulpChamberPath}
					fill="url(#dente-pulp-tissue)"
					stroke="rgba(220, 38, 38, 0.50)"
					strokeWidth="0.6"
					opacity={isDark ? 0.85 : 0.75}
				/>
			)}
		</g>
	);
};
