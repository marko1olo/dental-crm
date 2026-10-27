import React from "react";
import { Tooth14PulpChamber } from "./Tooth14PulpChamber";
import { TOOTH14_PULP_GEOMETRY } from "./tooth14PulpGeometry";
import { Tooth14SingleCanal } from "./Tooth14SingleCanal";

export interface Tooth14EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper First Premolar Tooth 14.
 * Wheeler Ch. 9: 2 Separate Root Canals (Buccal & Palatal) + Coronal Pulp Chamber.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14EndoCanals: React.FC<Tooth14EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH14_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth14-endodontics" {...(className ? { className } : {})}>
			{showPulp && (
				<Tooth14PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{showCanals && (
				<g id="tooth14-canals-tract">
					{p.canals.map((canal) => (
						<Tooth14SingleCanal
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
