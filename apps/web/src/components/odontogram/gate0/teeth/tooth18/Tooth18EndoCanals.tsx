import React from "react";
import { Tooth18PulpChamber } from "./Tooth18PulpChamber";
import { TOOTH18_PULP_GEOMETRY } from "./tooth18PulpGeometry";
import { Tooth18SingleCanal } from "./Tooth18SingleCanal";

export interface Tooth18EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Third Molar Tooth 18.
 * Wheeler Ch. 12: Fused/convergent canals with distal hook.
 * Seamless unified biological continuity connecting coronal chamber to radicular apices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth18EndoCanals: React.FC<Tooth18EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH18_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth18-endodontics" {...(className ? { className } : {})}>
			{/* Coronal Pulp Chamber (Seamlessly includes all 4 canal lumens when unified) */}
			{showPulp && (
				<Tooth18PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{/* 4 Root Canals (Palatal, MB1, MB2, DB) */}
			{showCanals && (
				<g id="tooth18-canals-tract">
					{p.canals.map((canal) => (
						<Tooth18SingleCanal
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
