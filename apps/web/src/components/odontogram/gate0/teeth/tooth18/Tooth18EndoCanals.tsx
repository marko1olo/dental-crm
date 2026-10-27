import React from "react";
import type { CanalCondition } from "../../tooth46Types";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import { TOOTH18_PULP_GEOMETRY } from "./tooth18Geometry";

export interface Tooth18EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth18EndoCanals: React.FC<Tooth18EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH18_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	const canalFill = showGuttaPercha
		? "url(#dente-guttapercha-cone)"
		: isNecrotic
		? "#1c1917"
		: "url(#dente-pulp-vital)";
	const canalStroke = showGuttaPercha
		? "url(#dente-guttapercha-sheath)"
		: isNecrotic
		? "#0c0a09"
		: isDark
		? "rgba(244, 63, 94, 0.7)"
		: "rgba(190, 18, 60, 0.6)";

	return (
		<g id="tooth18-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 3 anatomical horns */}
			{showPulp && (
				<g id="tooth18-pulp-chamber-group">
					<path
						id="tooth18-pulp-chamber"
						d={p.pulpChamberPath}
						fill={canalFill}
						stroke={canalStroke}
						strokeWidth="0.8"
					/>
					{p.horns.map((h) => (
						<circle key={h.id} cx={h.apex.x} cy={h.apex.y} r="1.2" fill={isDark ? "#fda4af" : "#f43f5e"} />
					))}
				</g>
			)}

			{/* 3 Canals (MB, Palatal, DB) */}
			{showCanals && (
				<g id="tooth18-canals-tract">
					{p.canals.map((c) => (
						<g key={c.id} id={`canal-${c.id}`}>
							<path
								d={c.taperedLumen}
								fill={canalFill}
								stroke={canalStroke}
								strokeWidth="0.75"
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
							/>
							<path
								d={c.centerLine}
								fill="none"
								stroke={showGuttaPercha ? "#ffffff" : isDark ? "#fb7185" : "#e11d48"}
								strokeWidth="0.6"
								strokeOpacity="0.85"
								strokeLinecap="round"
								vectorEffect="non-scaling-stroke"
							/>
						</g>
					))}

					{/* Apical Sealer Puffs at fused root tip during Overfill */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth18-overfill-puffs">
							<circle cx={42} cy={22} r={1.9} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
							<circle cx={48} cy={18} r={2.2} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
							<circle cx={54} cy={22} r={1.9} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
						</g>
					)}

					{/* Broken instrument in MB canal apical third */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="18"
							path="M 40,32 L 42,22"
							fracturePoint={{ x: 40, y: 32 }}
							flutes={["M 39,28 L 41,30", "M 40,24 L 42,26"]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
