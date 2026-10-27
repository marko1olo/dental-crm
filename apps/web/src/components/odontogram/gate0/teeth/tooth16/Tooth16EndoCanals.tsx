import React from "react";
import type { CanalCondition } from "../../tooth46Types";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import { TOOTH16_PULP_GEOMETRY } from "./tooth16Geometry";

export interface Tooth16EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth16EndoCanals: React.FC<Tooth16EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH16_PULP_GEOMETRY;
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
		<g id="tooth16-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 4 anatomical horns */}
			{showPulp && (
				<g id="tooth16-pulp-chamber-group">
					<path
						id="tooth16-pulp-chamber"
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

			{/* 4 Canals (MB1, MB2, Palatal, DB) */}
			{showCanals && (
				<g id="tooth16-canals-tract">
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

					{/* Apical Sealer Puffs at 3 root tips during Overfill */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth16-overfill-puffs">
							<circle cx={21} cy={16} r={2.0} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
							<circle cx={50} cy={10} r={2.4} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
							<circle cx={78.5} cy={18} r={1.9} fill="url(#dente-sealer-puff)" stroke="#881337" strokeWidth="0.5" />
						</g>
					)}

					{/* Broken instrument in MB1 canal apical third */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="16"
							path="M 24,28 L 21,16"
							fracturePoint={{ x: 24, y: 28 }}
							flutes={["M 23,24 L 25,26", "M 22,18 L 24,20"]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
