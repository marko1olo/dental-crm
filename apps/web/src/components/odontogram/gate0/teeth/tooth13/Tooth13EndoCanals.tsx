import type React from "react";
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
			{/* Coronal Pulp Chamber */}
			{showPulp && (
				<Tooth13PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Straight Cylindrical Canal Tract */}
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

					{/* Overfilled Apical Sealer Puff at Longest Apex (Y=8.0) */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth13-overfill-puffs">
							<path
								d="M 48.0,9.5 C 46.2,8.0 47.2,5.5 49.7,6.0 C 52.2,6.5 52.0,9.0 50.0,9.5 Z"
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
							path="M 50.0,24.0 L 50.0,10.2"
							fracturePoint={{ x: 50.0, y: 24.0 }}
							flutes={[
								"M 49.0,21.0 L 51.0,19.0",
								"M 49.0,16.0 L 51.0,14.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
