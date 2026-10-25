import type React from "react";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import type { CanalCondition } from "../../tooth46Types";
import { Tooth43PulpChamber } from "./Tooth43PulpChamber";
import { TOOTH43_PULP_GEOMETRY } from "./tooth43PulpGeometry";

export interface Tooth43EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth43EndoCanals: React.FC<Tooth43EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH43_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id="tooth43-endodontics" className={className}>
			{/* Coronal Pulp Chamber with spear-like horn */}
			{showPulp && (
				<Tooth43PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Longest Single Central Canal Tract */}
			{showCanals && (
				<g id="tooth43-canals-tract">
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
						<g id="tooth43-overfill-puffs">
							<path
								d="M 38.0,159.0 C 36.2,160.5 37.2,163.0 39.7,162.5 C 42.2,162.0 42.0,159.5 40.0,159.0 Z"
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<g id="tooth43-broken-file">
							<path
								d="M 41.5,147.0 L 39.5,158.8"
								fill="none"
								stroke="#e2e8f0"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
							<path
								d="M 40.5,149.0 L 42.5,151.0 M 39.0,153.5 L 41.0,155.5"
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
