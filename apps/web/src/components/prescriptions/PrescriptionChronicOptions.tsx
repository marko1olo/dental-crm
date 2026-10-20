/**
 * PrescriptionChronicOptions.tsx — Chronic Care Special Indication Input
 * Decomposed from PrescriptionValidityDetails.tsx per Mandate 8b (<= 120 lines).
 */

import type React from "react";

export interface PrescriptionChronicOptionsProps {
	readonly isChronicSpecialCare: boolean;
	readonly onToggleChronicSpecialCare: () => void;
	readonly chronicPeriodicity: string;
	readonly onChronicPeriodicityChange: (val: string) => void;
}

export const PrescriptionChronicOptions: React.FC<
	PrescriptionChronicOptionsProps
> = ({
	isChronicSpecialCare,
	onToggleChronicSpecialCare,
	chronicPeriodicity,
	onChronicPeriodicityChange,
}) => {
	return (
		<div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-1.5">
			<label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-800 dark:text-amber-200">
				<input
					type="checkbox"
					checked={isChronicSpecialCare}
					onChange={onToggleChronicSpecialCare}
					className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
				/>
				Спец. отметка «По специальному назначению» (хронические заболевания)
			</label>
			{isChronicSpecialCare && (
				<input
					type="text"
					placeholder="Периодичность отпуска (напр. ежемесячно / 1 раз в 15 дней)..."
					value={chronicPeriodicity}
					onChange={(e) => onChronicPeriodicityChange(e.target.value)}
					className="w-full px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-amber-500/30 text-[var(--ink)]"
				/>
			)}
		</div>
	);
};
