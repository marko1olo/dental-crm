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
 * Single Tapered Root Canal Endodontic System for Tooth 15 (Wheeler Ch. 10)
 * Central wide canal + Coronal pulp chamber with 2 equal-height horns.
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
			{/* Coronal Pulp Chamber with Balanced Buccal & Palatal Horns */}
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

			{/* Root Canal Tract (Main Canal) */}
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

					{/* Overfilled Apical Sealer Puff at Root Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth15-overfill-puffs">
							<path
								d="M 47.5,14.5 C 46.0,12.0 48.0,10.0 49.5,11.5 C 51.0,13.0 49.5,15.0 47.5,14.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument Marker */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="15"
							path="M 49.5,24.0 L 49.0,14.0"
							fracturePoint={{ x: 49.5, y: 24.0 }}
						/>
					)}
				</g>
			)}
		</g>
	);
};
