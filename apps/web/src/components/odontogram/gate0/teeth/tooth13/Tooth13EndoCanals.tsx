import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth13PulpChamber } from "./Tooth13PulpChamber";
import { TOOTH13_PULP_GEOMETRY } from "./tooth13PulpGeometry";

export interface Tooth13EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth13EndoCanals: React.FC<Tooth13EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH13_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth13-endodontics" className={className}>
			{showPulp && (
				<Tooth13PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{showCanals && (
				<g id="tooth13-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Deep Apex (50.0, 8.0) */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth13-overfill-puffs">
							<path
								d="M 48.5,8.5 C 47.0,6.5 48.0,3.5 50.0,4.0 C 52.0,3.5 53.0,6.5 51.5,8.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="13"
							path="M 50.0,22.0 C 50.0,18.0 50.0,14.0 50.0,10.5"
							fracturePoint={{ x: 50.0, y: 22.0 }}
							flutes={[
								"M 48.5,19.0 C 49.5,18.5 50.5,18.5 51.5,19.0",
								"M 48.8,15.0 C 49.6,14.5 50.4,14.5 51.2,15.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
