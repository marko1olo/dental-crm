import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth48PulpChamber } from "./Tooth48PulpChamber";
import { TOOTH48_PULP_GEOMETRY } from "./tooth48PulpGeometry";

export interface Tooth48EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth48EndoCanals: React.FC<Tooth48EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH48_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth48-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 4 rounded horns */}
			{showPulp && (
				<Tooth48PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Converging Canals into Distal Curved Apex */}
			{showCanals && (
				<g id="tooth48-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Distally-Curved Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth48-overfill-puffs">
							<path
								d="M 38.0,146.5 C 36.5,148.0 38.0,150.5 41.0,150.0 C 43.5,149.5 43.0,147.0 41.0,146.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Distal Curvature of Apical Third */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId="48"
							path="M 44.0,132.0 C 43.0,138.0 42.0,142.0 41.5,146.0"
							fracturePoint={{ x: 44.0, y: 132.0 }}
							flutes={[
								"M 42.0,135.5 L 44.0,137.5",
								"M 41.0,140.0 L 43.0,142.0",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
