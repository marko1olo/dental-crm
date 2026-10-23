import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth44PulpChamber } from "./Tooth44PulpChamber";
import { TOOTH44_PULP_GEOMETRY } from "./tooth44PulpGeometry";

export interface Tooth44EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth44EndoCanals: React.FC<Tooth44EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH44_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth44-endodontics" className={className}>
			{/* Coronal Pulp Chamber with asymmetric horns */}
			{showPulp && (
				<Tooth44PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Single Central Canal Tract */}
			{showCanals && (
				<g id="tooth44-canals-tract">
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal as any}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Conical Root Apex */}
					{showGuttaPercha && isOverfill && (
						<g id="tooth44-overfill-puffs">
							<path
								d="M 49.0,145.5 C 47.5,147.0 48.5,149.5 51.0,149.0 C 53.5,148.5 53.0,146.0 51.0,145.5 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<g id="tooth44-broken-file">
							<path
								d="M 50.8,135.0 L 51.0,145.5"
								fill="none"
								stroke="#e2e8f0"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
							<path
								d="M 50.0,137.0 L 52.0,139.0 M 50.0,141.0 L 52.0,143.0"
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
