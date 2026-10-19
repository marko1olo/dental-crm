import type React from "react";
import { Tooth16EndoShaders } from "./Tooth16EndoShaders";
import { TOOTH16_PULP_GEOMETRY } from "./Tooth16PulpGeometry";

export interface Tooth16EndoCanalsProps {
	showPulp?: boolean;
	showCanals?: boolean;
	showGuttaPercha?: boolean;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — 4-Canal Endodontic System for Upper Molars 16 / 26
 * Seamless 1.5px orifice insertion into pulp floor (0px visual gaps).
 * Mandate 8b <= 120 lines.
 */
export const Tooth16EndoCanals: React.FC<Tooth16EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	isDark = false,
}) => {
	const stroke = showGuttaPercha
		? "url(#dente16-guttapercha)"
		: "url(#dente16-canal-vascular)";
	const pulpFill = showGuttaPercha
		? "url(#dente16-guttapercha)"
		: "url(#dente16-pulp-glow)";

	return (
		<g id="tooth16-endo-group">
			<Tooth16EndoShaders />

			{/* Pulp chamber with 4 anatomical horns */}
			{showPulp && (
				<g id="tooth16-pulp-chamber-container">
					<path
						id="tooth16-pulp-chamber"
						d={TOOTH16_PULP_GEOMETRY.pulpChamberPath}
						fill={pulpFill}
						stroke={
							isDark ? "rgba(244, 63, 94, 0.7)" : "rgba(190, 18, 60, 0.6)"
						}
						strokeWidth="0.8"
					/>
					{/* Orifice funnels inside the floor */}
					{TOOTH16_PULP_GEOMETRY.orifices.map((o) => (
						<ellipse
							key={o.id}
							cx={o.x}
							cy={o.y}
							rx={o.rx}
							ry={o.ry}
							fill={
								isDark ? "rgba(159, 18, 57, 0.9)" : "rgba(136, 19, 55, 0.85)"
							}
						/>
					))}
				</g>
			)}

			{/* 4 Canals (MB1, MB2, Palatal, DB) */}
			{showCanals && (
				<g id="tooth16-canals-group" fill="none" strokeLinecap="round">
					{TOOTH16_PULP_GEOMETRY.canals.map((c) => (
						<path
							key={c.id}
							id={`tooth16-canal-${c.id}`}
							d={c.path}
							stroke={stroke}
							strokeWidth={showGuttaPercha ? c.width * 1.35 : c.width}
						/>
					))}
				</g>
			)}

			{/* Apical sealer caps during gutta-percha obturation */}
			{showGuttaPercha && (
				<g id="tooth16-apical-sealer-caps">
					<circle cx={18} cy={14} r={1.6} fill="url(#dente16-apical-sealer)" />
					<circle cx={23} cy={22} r={1.2} fill="url(#dente16-apical-sealer)" />
					<circle cx={50} cy={8} r={2.2} fill="url(#dente16-apical-sealer)" />
					<circle cx={82} cy={18} r={1.5} fill="url(#dente16-apical-sealer)" />
				</g>
			)}
		</g>
	);
};
