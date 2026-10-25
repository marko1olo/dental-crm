import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
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
								d="M 46.0,143.0 C 44.3,144.5 45.3,147.0 47.8,146.5 C 50.0,146.0 49.8,143.5 47.8,143.0 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<g id="tooth42-broken-file">
							<path
								d="M 48.6,133.0 L 47.3,142.8"
								fill="none"
								stroke="#e2e8f0"
								strokeWidth="1.1"
								strokeLinecap="round"
							/>
							<path
								d="M 47.5,135.0 L 49.5,137.0 M 46.5,139.0 L 48.5,141.0"
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
