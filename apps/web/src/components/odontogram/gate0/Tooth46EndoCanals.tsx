import type React from "react";
import { Tooth46BrokenFileOverlay } from "./Tooth46BrokenFileOverlay";
import { TOOTH46_ENDO_PATHOLOGY_GEOMETRY } from "./Tooth46EndoPathologyGeometry";
import { Tooth46PulpChamber } from "./Tooth46PulpChamber";
import { TOOTH46_PULP_GEOMETRY } from "./Tooth46PulpGeometry";
import { Tooth46SingleCanal } from "./Tooth46SingleCanal";
import type { CanalCondition } from "./tooth46Types";

export interface Tooth46EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: CanalCondition | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth46EndoCanals: React.FC<Tooth46EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = true,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH46_PULP_GEOMETRY;
	const pathGeo = TOOTH46_ENDO_PATHOLOGY_GEOMETRY;

	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";
	const isUnified = Boolean(showPulp && showCanals);

	return (
		<g id="tooth46-endodontics" className={className}>
			{/* Wheeler Ch. 11 Coronal Cavitas Pulparis Chamber (Monolithic seamless system) */}
			{showPulp && (
				<Tooth46PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{/* 3 Radicular Canals (MB, ML, D) Seamlessly Integrated with Chamber Floor */}
			{showCanals && (
				<g id="tooth46-canals-tract">
					{p.canals.map((canal, idx) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
							underfillData={pathGeo.underfill[idx]}
							isUnifiedLumen={isUnified}
						/>
					))}

					{/* Overfilled Apical Sealer Mushroom Puffs */}
					{showGuttaPercha &&
						isOverfill &&
						pathGeo.overfillPuffs.map((puff) => (
							<path
								key={puff.id}
								d={puff.d}
								fill="url(#dente-sealer-puff)"
								stroke="#881337"
								strokeWidth="0.6"
								vectorEffect="non-scaling-stroke"
							/>
						))}

					{/* Fractured NiTi Rotary Instrument in Apical Third of MB Canal */}
					{isBrokenFile && <Tooth46BrokenFileOverlay isDark={isDark} />}
				</g>
			)}
		</g>
	);
};
