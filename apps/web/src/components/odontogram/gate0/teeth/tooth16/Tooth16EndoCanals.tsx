import React from "react";
import { Tooth16PulpChamber } from "./Tooth16PulpChamber";
import { TOOTH16_PULP_GEOMETRY } from "./tooth16PulpGeometry";
import { Tooth16SingleCanal } from "./Tooth16SingleCanal";

export interface Tooth16EndoCanalsProps {
	showPulp?: boolean | undefined;
	showCanals?: boolean | undefined;
	showGuttaPercha?: boolean | undefined;
	canalCondition?: string | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Endodontic System for Maxillary First Molar Tooth 16.
 * Wheeler Ch. 11: 4 Canals (P, MB1, MB2, DB) + Coronal Pulp Chamber.
 * Seamless unified biological continuity connecting coronal chamber to radicular apices.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth16EndoCanals: React.FC<Tooth16EndoCanalsProps> = ({
	showPulp = true,
	showCanals = true,
	showGuttaPercha = false,
	canalCondition = "vital",
	isDark = false,
	className,
}) => {
	const p = TOOTH16_PULP_GEOMETRY;
	const isNecrotic = canalCondition === "necrotic";
	const isPulpitis = canalCondition === "pulpitis";
	const isUnified = Boolean(showPulp && showCanals && !showGuttaPercha);

	return (
		<g id="tooth16-endodontics" {...(className ? { className } : {})}>
			{/* Coronal Pulp Chamber (Seamlessly includes all 4 canal lumens when unified) */}
			{showPulp && (
				<Tooth16PulpChamber
					condition={canalCondition}
					isDark={isDark}
					unified={isUnified}
				/>
			)}

			{/* 4 Root Canals (Palatal, MB1, MB2, DB) */}
			{showCanals && (
				<g id="tooth16-canals-tract">
					{p.canals.map((canal) => (
						<Tooth16SingleCanal
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
