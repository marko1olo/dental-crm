import React from "react";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";
import { Tooth46SingleCanal } from "../../Tooth46SingleCanal";
import { ToothBrokenFileMarker } from "../../ToothBrokenFileMarker";
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
	const tNum = useToothNumber() ?? 43;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const p = TOOTH43_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isUnderfill = canalCondition === "underfill";
	const isOverfill = canalCondition === "overfill";
	const isBrokenFile = canalCondition === "broken_file";

	return (
		<g id={sid(`tooth${tNum}-endodontics`)} className={className}>
			{/* Coronal Pulp Chamber with spear-like horn */}
			{showPulp && (
				<Tooth43PulpChamber condition={canalCondition} isDark={isDark} />
			)}

			{/* Longest Single Central Canal Tract */}
			{showCanals && (
				<g id={sid(`tooth${tNum}-canals-tract`)}>
					{p.canals.map((canal) => (
						<Tooth46SingleCanal
							key={canal.id}
							canal={canal}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isUnderfill={isUnderfill}
						/>
					))}

					{/* Overfilled Apical Sealer Puff at Canine Apex */}
					{showGuttaPercha && isOverfill && (
						<g id={sid(`tooth${tNum}-overfill-puffs`)}>
							<path
								d="M 38.0,159.0 C 36.2,160.5 37.2,163.0 39.7,162.5 C 42.2,162.0 42.0,159.5 40.0,159.0 Z"
								fill={`url(#${sid("dente-sealer-puff")})`}
								stroke="#881337"
								strokeWidth="0.6"
							/>
						</g>
					)}

					{/* Broken Instrument in Apical Third of Root Canal */}
					{isBrokenFile && (
						<ToothBrokenFileMarker
							toothId={String(tNum)}
							path="M 40.5,146.0 L 39.5,158.8"
							fracturePoint={{ x: 40.5, y: 146.0 }}
							flutes={[
								"M 39.5,149.0 L 41.5,151.0",
								"M 38.5,153.5 L 40.5,155.5",
							]}
							isDark={isDark}
						/>
					)}
				</g>
			)}
		</g>
	);
};
