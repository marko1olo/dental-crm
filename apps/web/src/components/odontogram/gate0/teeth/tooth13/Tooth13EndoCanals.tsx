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
			{/* Coronal Pulp Chamber with spear-like horn */}
			{showPulp && (
				<Tooth13PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Longest Single Central Canal Tract */}
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

					{/* Overfilled Apical Sealer Puff at Canine Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth13-overfill-puffs">
							<path
								d="M 50.0,7.0 C 48.2,5.5 49.2,3.0 51.7,3.5 C 54.2,4.0 54.0,6.5 52.0,7.0 Z"
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
							path="M 51.0,22.0 L 51.8,9.2"
							fracturePoint={{ x: 51.0, y: 22.0 }}
							flutes={[
								"M 50.0,19.0 L 52.0,17.0",
								"M 50.5,14.5 L 52.5,12.5",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
