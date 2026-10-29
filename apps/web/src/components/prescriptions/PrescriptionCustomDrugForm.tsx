/**
 * PrescriptionCustomDrugForm.tsx — Add Custom Formulated Drug
 * Allows prescribing medications outside the default dental catalog.
 */

import React from "react";

export interface PrescriptionCustomDrugFormProps {
	readonly isAddingCustom: boolean;
	readonly customTradeName: string;
	readonly onCustomTradeNameChange: (val: string) => void;
	readonly customLatinRp: string;
	readonly onCustomLatinRpChange: (val: string) => void;
	readonly customDispense: string;
	readonly onCustomDispenseChange: (val: string) => void;
	readonly customSigna: string;
	readonly onCustomSignaChange: (val: string) => void;
	readonly onAddCustomDrug: () => void;
}

export const PrescriptionCustomDrugForm: React.FC<
	PrescriptionCustomDrugFormProps
> = ({
	isAddingCustom,
	customTradeName,
	onCustomTradeNameChange,
	customLatinRp,
	onCustomLatinRpChange,
	customDispense,
	onCustomDispenseChange,
	customSigna,
	onCustomSignaChange,
	onAddCustomDrug,
}) => {
	if (!isAddingCustom) return null;

	return (
		<div className="p-3 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-2">
			<div className="text-xs font-bold text-[var(--ink)]">
				Добавление нестандартного препарата:
			</div>
			<input
				type="text"
				placeholder="Торговое название (напр. Нимесил)..."
				value={customTradeName}
				onChange={(e) => onCustomTradeNameChange(e.target.value)}
				className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
			/>
			<input
				type="text"
				placeholder="Латинская пропись (Rp.: Nimesulidi 100 mg)..."
				value={customLatinRp}
				onChange={(e) => onCustomLatinRpChange(e.target.value)}
				className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
			/>
			<div className="flex gap-2">
				<input
					type="text"
					placeholder="Отпуск (D.t.d. N 10)..."
					value={customDispense}
					onChange={(e) => onCustomDispenseChange(e.target.value)}
					className="w-1/2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
				/>
				<input
					type="text"
					placeholder="Сигнатура (S. Внутрь по 1 пак. 2 р/д)..."
					value={customSigna}
					onChange={(e) => onCustomSignaChange(e.target.value)}
					className="w-1/2 px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
				/>
			</div>
			<button
				type="button"
				onClick={onAddCustomDrug}
				className="secondary-button btn btn--secondary h-8 px-3.5 text-xs font-semibold rounded-lg transition-all cursor-pointer self-end"
			>
				Добавить в рецепт
			</button>
		</div>
	);
};
