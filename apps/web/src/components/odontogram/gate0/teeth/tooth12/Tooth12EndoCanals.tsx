import React from "react";
import { Tooth12PulpChamber } from "./Tooth12PulpChamber";
import { TOOTH12_PULP_GEOMETRY } from "./tooth12PulpGeometry";
import { Tooth12SingleCanal } from "./Tooth12SingleCanal";

export interface Tooth12EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Lateral Incisor 12.
 * Wheeler Ch. 7: Single Slender Canal (L) + Coronal Pulp Chamber.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12EndoCanals: React.FC<Tooth12EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH12_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth12-endodontics" {...(className ? { className } : {})}>
			{showPulp && (
				<Tooth12PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{showCanals && (
				<g id="tooth12-canals-tract">
					{p.canals.map((canal) => (
						<Tooth12SingleCanal
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
