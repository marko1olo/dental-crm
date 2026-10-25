import React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth47PulpChamber } from "./Tooth47PulpChamber";
import { TOOTH47_PULP_GEOMETRY } from "./tooth47PulpGeometry";

export interface Tooth47EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth47EndoCanals: React.FC<Tooth47EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH47_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth47-endodontics" className={className}>
			{/* Coronal Pulp Chamber with 4 horns */}
			{showPulp && (
				<Tooth47PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* 3 Parallel Radicular Canals (MB, ML, D) */}
			{showCanals && (
				<g id="tooth47-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Mushroom Puffs at parallel root apices */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth47-overfill-puffs">
							<path
								d="M 22.0,145.5 C 20.5,147.0 21.0,149.5 23.5,149.0 C 25.5,148.5 25.0,146.0 23.5,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
							<path
								d="M 56.5,144.5 C 55.0,146.0 55.5,148.5 58.0,148.0 C 60.0,147.5 59.5,145.0 58.0,144.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Mesial Canal */}
					{isBrokenFile && (
						<g id="tooth47-broken-file">
							<path
								d="M 24.5,135.0 L 23.5,145.5"
								stroke="#e2e8f0"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
							<path
								d="M 23.5,137.0 L 25.5,139.0 M 23.0,141.0 L 25.0,143.0"
								stroke="#0284c7"
								strokeWidth="0.8"
							/>
						</g>
					)}
				</g>
			)}
		</g>
	);
};
