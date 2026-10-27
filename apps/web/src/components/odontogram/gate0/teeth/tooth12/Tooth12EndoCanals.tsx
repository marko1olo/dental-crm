import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth12PulpChamber } from "./Tooth12PulpChamber";
import { TOOTH12_PULP_GEOMETRY } from "./tooth12PulpGeometry";

export interface Tooth12EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth12EndoCanals: React.FC<Tooth12EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH12_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth12-endodontics" className={className}>
			{showPulp && (
				<Tooth12PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{showCanals && (
				<g id="tooth12-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Curved Apex (55.0, 14.0) */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth12-overfill-puffs">
							<path
								d="M 53.5,14.5 C 52.0,12.5 53.0,9.5 55.0,10.0 C 57.0,9.5 58.0,12.5 56.5,14.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Curved Third */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="12"
							path="M 53.5,28.0 C 54.0,24.0 54.5,20.0 55.0,16.5"
							fracturePoint={{ x: 53.5, y: 28.0 }}
							flutes={[
								"M 52.0,25.0 C 53.0,24.5 54.0,24.5 55.0,25.0",
								"M 52.5,21.0 C 53.3,20.5 54.1,20.5 54.9,21.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
