import React from "react";
import { Tooth13PulpChamber } from "./Tooth13PulpChamber";
import { TOOTH13_PULP_GEOMETRY } from "./tooth13PulpGeometry";
import { Tooth13SingleCanal } from "./Tooth13SingleCanal";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth13EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Canine 13.
 * Wheeler Ch. 8: Single Massive Root Canal (C) + Coronal Pulp Chamber.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13EndoCanals: React.FC<Tooth13EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 13;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const p = TOOTH13_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id={sid(`tooth${tNum}-endodontics`)} {...(className ? { className } : {})}>
			{showPulp && (
				<Tooth13PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{showCanals && (
				<g id={sid(`tooth${tNum}-canals-tract`)}>
					{p.canals.map((canal) => (
						<Tooth13SingleCanal
							key={canal.id}
							canal={canal}
							showGuttaPercha={showGuttaPercha}
							isNecrotic={isNecrotic}
							isPulpitis={isPulpitis}
							isDark={isDark}
							isUnifiedLumen={isUnified}
						/>
					))}
				</g>
			)}
		</g>
	);
};
