import type React from "react";
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
			{/* Coronal Pulp Chamber */}
			{showPulp && (
				<Tooth12PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Curved Canal Tract */}
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

					{/* Overfilled Apical Sealer Puff at Curved Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth12-overfill-puffs">
							<path
								d="M 42.5,19.0 C 40.5,17.5 41.5,15.0 44.0,15.5 C 46.5,16.0 46.2,18.5 44.5,19.0 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="12"
							path="M 47.0,32.0 L 44.0,19.5"
							fracturePoint={{ x: 47.0, y: 32.0 }}
							flutes={[
								"M 46.0,29.0 L 48.0,27.0",
								"M 44.5,24.0 L 46.5,22.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
