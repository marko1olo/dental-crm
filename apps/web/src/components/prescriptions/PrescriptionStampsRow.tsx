/**
 * PrescriptionStampsRow.tsx — Official Physical Ink Stamp Circles Mockup
 */

import React from "react";
import type { PrescriptionFormType } from "./prescriptionPreviewTypes";

export interface PrescriptionStampsRowProps {
	readonly withStampAndSignature: boolean;
	readonly activeForm: PrescriptionFormType;
}

export const PrescriptionStampsRow: React.FC<PrescriptionStampsRowProps> = ({
	withStampAndSignature,
	activeForm,
}) => {
	const isSpecial = activeForm === "special" || activeForm === "148-1u-88";

	return (
		<div className="flex items-center gap-2 shrink-0">
			<div
				className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
					withStampAndSignature
						? "border-2 border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
						: "border border-dashed border-[var(--line)] text-[var(--muted)]"
				}`}
			>
				<span>ВРАЧ</span>
				<span className="text-[8px]">М.П.</span>
			</div>
			<div
				className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
					withStampAndSignature
						? "border-2 border-double border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
						: "border border-dashed border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300"
				}`}
			>
				<span className="text-[6px] uppercase">КЛИНИКА</span>
				<span>
					Для
					<br />
					рецептов
				</span>
			</div>
			{isSpecial && (
				<div className="w-10 h-10 border border-dashed border-rose-600 dark:border-rose-400 clip-path-tri flex items-center justify-center font-bold text-[7.5px] text-rose-700 dark:text-rose-300 text-center">
					СПЕЦ.
				</div>
			)}
		</div>
	);
};
