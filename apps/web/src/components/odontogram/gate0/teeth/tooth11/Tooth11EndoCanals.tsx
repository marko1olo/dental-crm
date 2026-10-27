import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth11PulpChamber } from "./Tooth11PulpChamber";
import { TOOTH11_PULP_GEOMETRY } from "./tooth11PulpGeometry";

export interface Tooth11EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth11EndoCanals: React.FC<Tooth11EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH11_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth11-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 3 mamelon horns */}
			{showPulp && (
				<Tooth11PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Wide Cylindrical Central Canal Tract */}
			{showCanals && (
				<g id="tooth11-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Apex (50.0, 14.0) */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth11-overfill-puffs">
							<path
								d="M 48.5,14.5 C 47.0,12.5 48.0,9.5 50.0,10.0 C 52.0,9.5 53.0,12.5 51.5,14.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="11"
							path="M 50.0,28.0 C 50.0,24.0 50.0,20.0 50.0,16.5"
							fracturePoint={{ x: 50.0, y: 28.0 }}
							flutes={[
								"M 48.5,25.0 C 49.5,24.5 50.5,24.5 51.5,25.0",
								"M 48.8,21.0 C 49.6,20.5 50.4,20.5 51.2,21.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
