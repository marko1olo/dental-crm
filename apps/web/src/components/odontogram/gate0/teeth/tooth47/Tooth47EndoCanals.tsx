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
								d="M 29.5,145.5 C 28.0,147.0 28.5,149.5 31.0,149.0 C 33.0,148.5 32.5,146.0 31.0,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
							<path
								d="M 67.5,144.5 C 66.0,146.0 66.5,148.5 69.0,148.0 C 71.0,147.5 70.5,145.0 69.0,144.5 Z"
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
								d="M 31.0,135.0 L 31.0,145.5"
								stroke="#e2e8f0"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
							<path
								d="M 30.2,137.0 L 31.8,139.0 M 30.2,141.0 L 31.8,143.0"
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
