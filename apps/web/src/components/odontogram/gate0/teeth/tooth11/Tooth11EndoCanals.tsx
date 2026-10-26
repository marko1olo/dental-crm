import type React from "react";
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
			{/* Coronal Pulp Chamber */}
			{showPulp && (
				<Tooth11PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Straight Cylindrical Canal Tract */}
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

					{/* Overfilled Apical Sealer Puff at Straight Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth11-overfill-puffs">
							<path
								d="M 48.0,15.5 C 46.2,14.0 47.2,11.5 49.7,12.0 C 52.2,12.5 52.0,15.0 50.0,15.5 Z"
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
							path="M 50.0,30.0 L 50.0,16.2"
							fracturePoint={{ x: 50.0, y: 30.0 }}
							flutes={[
								"M 49.0,27.0 L 51.0,25.0",
								"M 49.0,22.0 L 51.0,20.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
