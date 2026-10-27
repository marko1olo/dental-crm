import React from "react";
import { Tooth15PulpChamber } from "./Tooth15PulpChamber";
import { TOOTH15_PULP_GEOMETRY } from "./tooth15PulpGeometry";
import { Tooth15SingleCanal } from "./Tooth15SingleCanal";

export interface Tooth15EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Second Premolar Tooth 15.
 * Wheeler Ch. 10: Single Central Root Canal (P) + Coronal Pulp Chamber.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth15EndoCanals: React.FC<Tooth15EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH15_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth15-endodontics" {...(className ? { className } : {})}>
			{showPulp && (
				<Tooth15PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{showCanals && (
				<g id="tooth15-canals-tract">
					{p.canals.map((canal) => (
						<Tooth15SingleCanal
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
