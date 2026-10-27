import React from "react";
import { Tooth17PulpChamber } from "./Tooth17PulpChamber";
import { TOOTH17_PULP_GEOMETRY } from "./tooth17PulpGeometry";
import { Tooth17SingleCanal } from "./Tooth17SingleCanal";

export interface Tooth17EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Upper Second Molar Tooth 17.
 * Wheeler Ch. 12: 4 Convergent Canals (P, MB1, MB2, DB) with distal sweep.
 * Seamless unified biological continuity connecting coronal chamber to radicular apices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth17EndoCanals: React.FC<Tooth17EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH17_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth17-endodontics" {...(className ? { className } : {})}>
			{/* Coronal Pulp Chamber (Seamlessly includes all 4 canal lumens when unified) */}
			{showPulp && (
				<Tooth17PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{/* 4 Root Canals (Palatal, MB1, MB2, DB) */}
			{showCanals && (
				<g id="tooth17-canals-tract">
					{p.canals.map((canal) => (
						<Tooth17SingleCanal
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
