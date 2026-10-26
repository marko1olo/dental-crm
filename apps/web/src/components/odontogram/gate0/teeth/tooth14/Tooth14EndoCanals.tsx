import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH14_GEOMETRY } from "./tooth14Geometry";

export interface Tooth14EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Dual Root Canal Endodontic System for Tooth 14 (Wheeler Ch. 10)
 * 2 separate canals (Buccal & Palatal) + Coronal pulp chamber with 2 horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth14EndoCanals: React.FC<Tooth14EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH14_GEOMETRY.pulp;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	const pulpFill = isNecrotic
		? isDark ? "#1e293b" : "#334155"
		: isDark ? "url(#dente-pulp-vital-dark)" : "url(#dente-pulp-vital)";
	const pulpStroke = isNecrotic
		? "#0f172a"
		: isDark ? "rgba(244, 63, 94, 0.70)" : "rgba(225, 29, 72, 0.75)";

	return (
		<g id="tooth14-endodontics" className={className}>
			{/* Coronal Pulp Chamber with Buccal & Palatal Horns */}
			{showPulp && (
				<g id="tooth14-pulp-chamber">
					<path
						d={p.chamberPath}
						fill={pulpFill}
						stroke={pulpStroke}
						strokeWidth="0.75"
						strokeLinejoin="round"
					/>
				</g>
			)}

			{/* Dual Root Canal System (Buccal & Palatal) */}
			{showCanals && (
				<g id="tooth14-canals-tract">
					{/* Buccal Canal */}
					<Tooth46SingleCanal
						canal={p.buccalCanal as any}
						showGuttaPercha={showGuttaPercha}
						isNecrotic={isNecrotic}
						isUnderfill={isUnderfill}
					/>
					{/* Palatal Canal */}
					<Tooth46SingleCanal
						canal={p.palatalCanal as any}
						showGuttaPercha={showGuttaPercha}
						isNecrotic={isNecrotic}
						isUnderfill={isUnderfill}
					/>

					{/* Overfilled Apical Sealer Puffs at both apices */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth14-overfill-puffs">
							{/* Buccal Apex Puff */}
							<path
								d="M 36.5,12.5 C 35.0,10.0 37.0,8.0 38.5,9.5 C 40.0,11.0 38.5,13.0 36.5,12.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
							{/* Palatal Apex Puff */}
							<path
								d="M 60.5,14.5 C 59.0,12.0 61.0,10.0 62.5,11.5 C 64.0,13.0 62.5,15.0 60.5,14.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Buccal Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="14"
							path="M 39.5,24.0 L 38.0,12.0"
							fracturePoint={{ x: 39.5, y: 24.0 }}
							flutes={[
								"M 38.8,21.0 L 40.2,19.5",
								"M 38.2,17.0 L 39.6,15.5",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
