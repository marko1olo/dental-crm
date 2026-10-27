import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth45PulpChamber } from "./Tooth45PulpChamber";
import { TOOTH45_PULP_GEOMETRY } from "./tooth45PulpGeometry";

export interface Tooth45EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth45EndoCanals: React.FC<Tooth45EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH45_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth45-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 3 horns */}
			{showPulp && (
				<Tooth45PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Single Wide Central Canal Tract */}
			{showCanals && (
				<g id="tooth45-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Conical Root Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth45-overfill-puffs">
							<path
								d="M 40.0,145.5 C 38.5,147.0 39.5,149.5 42.0,149.0 C 44.5,148.5 44.0,146.0 42.0,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="45"
							path="M 44.5,134.0 L 42.0,145.5"
							fracturePoint={{ x: 44.5, y: 134.0 }}
							flutes={[
								"M 43.0,137.0 L 45.0,139.0",
								"M 42.0,141.0 L 44.0,143.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
