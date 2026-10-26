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

			{/* Single Canal Tract with Distal Curve */}
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
								d="M 53.0,14.5 C 51.2,13.0 52.2,10.5 54.7,11.0 C 57.2,11.5 57.0,14.0 55.0,14.5 Z"
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
							path="M 52.5,28.0 L 54.0,15.2"
							fracturePoint={{ x: 52.5, y: 28.0 }}
							flutes={[
								"M 51.5,25.0 L 53.5,23.0",
								"M 52.0,20.5 L 54.0,18.5",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
