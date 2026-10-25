import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth41PulpChamber } from "./Tooth41PulpChamber";
import { TOOTH41_PULP_GEOMETRY } from "./tooth41PulpGeometry";

export interface Tooth41EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth41EndoCanals: React.FC<Tooth41EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH41_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth41-endodontics" className={className}>
			{/* Coronal Pulp Chamber with mamelon horns */}
			{showPulp && (
				<Tooth41PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Slender Straight Single Canal Tract */}
			{showCanals && (
				<g id="tooth41-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Central Incisor Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth41-overfill-puffs">
							<path
								d="M 43.8,142.0 C 42.0,143.5 43.0,146.0 45.0,145.5 C 47.0,145.0 47.5,142.5 45.5,142.0 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<g id="tooth41-broken-file">
							<path
								d="M 46.5,132.0 L 45.2,141.8"
								fill="none"
								stroke="#e2e8f0"
								strokeWidth="1.1"
								strokeLinecap="round"
							/>
							<path
								d="M 45.0,134.0 L 47.0,136.0 M 44.5,138.0 L 46.5,140.0"
								stroke="#0284c7"
								strokeWidth="0.75"
							/>
						</g>
					)}
				</g>
			)}
		</g>
	);
};
