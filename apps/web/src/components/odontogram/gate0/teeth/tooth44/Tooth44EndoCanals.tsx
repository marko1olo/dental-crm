import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth44PulpChamber } from "./Tooth44PulpChamber";
import { TOOTH44_PULP_GEOMETRY } from "./tooth44PulpGeometry";

export interface Tooth44EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth44EndoCanals: React.FC<Tooth44EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH44_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth44-endodontics" className={className}>
			{/* Coronal Pulp Chamber with asymmetric horns */}
			{showPulp && (
				<Tooth44PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Single Central Canal Tract */}
			{showCanals && (
				<g id="tooth44-canals-tract">
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
						<g id="tooth44-overfill-puffs">
							<path
								d="M 41.0,145.5 C 39.5,147.0 40.5,149.5 43.0,149.0 C 45.5,148.5 45.0,146.0 43.0,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="44"
							path="M 45.0,134.0 L 43.0,145.5"
							fracturePoint={{ x: 45.0, y: 134.0 }}
							flutes={[
								"M 43.5,137.0 L 45.5,139.0",
								"M 42.5,141.0 L 44.5,143.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
