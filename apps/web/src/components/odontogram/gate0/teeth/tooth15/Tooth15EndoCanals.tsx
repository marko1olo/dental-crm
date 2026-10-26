import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";

export interface Tooth15EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Single Wide Canal Endodontic System for Tooth 15 (Wheeler Ch. 10)
 * 1 central canal + Coronal pulp chamber with 2 equal-height horns.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth15EndoCanals: React.FC<Tooth15EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH15_GEOMETRY.pulp;
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
		<g id="tooth15-endodontics" className={className}>
			{/* Coronal Pulp Chamber with Symmetrical Buccal & Palatal Horns */}
			{showPulp && (
				<g id="tooth15-pulp-chamber">
					<path
						d={p.chamberPath}
						fill={pulpFill}
						stroke={pulpStroke}
						strokeWidth="0.75"
						strokeLinejoin="round"
					/>
				</g>
			)}

			{/* Single Wide Root Canal System */}
			{showCanals && (
				<g id="tooth15-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Conical Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth15-overfill-puffs">
							<path
								d="M 47.0,13.5 C 45.5,11.0 47.5,9.0 49.0,10.5 C 50.5,12.0 49.0,14.0 47.0,13.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="15"
							path="M 49.5,25.0 L 49.0,13.0"
							fracturePoint={{ x: 49.5, y: 25.0 }}
							flutes={[
								"M 48.8,22.0 L 50.2,20.5",
								"M 48.2,18.0 L 49.6,16.5",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
