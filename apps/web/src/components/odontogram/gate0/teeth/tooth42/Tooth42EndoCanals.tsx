import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth42PulpChamber } from "./Tooth42PulpChamber";
import { TOOTH42_PULP_GEOMETRY } from "./tooth42PulpGeometry";

export interface Tooth42EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth42EndoCanals: React.FC<Tooth42EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH42_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth42-endodontics" className={className}>
			{/* Coronal Pulp Chamber with mamelon horns */}
			{showPulp && (
				<Tooth42PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Slender Single Canal Tract */}
			{showCanals && (
				<g id="tooth42-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Lateral Incisor Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth42-overfill-puffs">
							<path
								d="M 40.8,143.0 C 39.1,144.5 40.1,147.0 42.6,146.5 C 44.8,146.0 44.6,143.5 42.6,143.0 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="42"
							path="M 44.0,132.0 L 42.3,142.8"
							fracturePoint={{ x: 44.0, y: 132.0 }}
							flutes={[
								"M 42.8,135.0 L 44.8,137.0",
								"M 41.8,139.0 L 43.8,141.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
