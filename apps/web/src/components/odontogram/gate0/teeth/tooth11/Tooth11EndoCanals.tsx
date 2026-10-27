import React from "react";
import { Tooth11PulpChamber } from "./Tooth11PulpChamber";
import { TOOTH11_PULP_GEOMETRY } from "./tooth11PulpGeometry";
import { Tooth11SingleCanal } from "./Tooth11SingleCanal";

export interface Tooth11EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Central Incisor 11.
 * Wheeler Ch. 6: Single Broad Straight Canal (M) + Coronal Pulp Chamber.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11EndoCanals: React.FC<Tooth11EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH11_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth11-endodontics" {...(className ? { className } : {})}>
			{showPulp && (
				<Tooth11PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{showCanals && (
				<g id="tooth11-canals-tract">
					{p.canals.map((canal) => (
						<Tooth11SingleCanal
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
