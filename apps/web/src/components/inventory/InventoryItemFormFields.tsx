import React from "react";
import type { InventoryItemFormData } from "./InventoryItemFormModal.js";

export interface InventoryItemFormFieldsProps {
	readonly formData: InventoryItemFormData;
	readonly setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>> | ((data: InventoryItemFormData) => void);
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly isSaving: boolean;
}

export const InventoryItemFormFields: React.FC<InventoryItemFormFieldsProps> = ({
	formData,
	setFormData,
	onSubmit,
	isSaving,
}) => {
	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3.5">
			<div className="flex flex-col gap-1">
				<label htmlFor="inv-item-name" className="text-xs font-semibold text-[var(--muted)]">
					Наименование *
				</label>
				<input
					id="inv-item-name"
					type="text"
					required
					value={formData.name}
					onChange={(e) => setFormData({ ...formData, name: e.target.value })}
					className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-teal-500"
					placeholder="Перчатки нитриловые, Альгинат..."
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<label htmlFor="inv-item-threshold" className="text-xs font-semibold text-[var(--muted)]">
						Мин. остаток (шт)
					</label>
					<input
						id="inv-item-threshold"
						type="number"
						min="0"
						required
						value={formData.threshold}
						onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
						className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-teal-500"
						placeholder="5"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label htmlFor="inv-item-price" className="text-xs font-semibold text-[var(--muted)]">
						Цена за единицу (₽)
					</label>
					<input
						id="inv-item-price"
						type="text"
						inputMode="decimal"
						value={formData.unitCostRub}
						onChange={(e) => setFormData({ ...formData, unitCostRub: e.target.value })}
						className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-teal-500"
						placeholder="12,50"
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<label htmlFor="inv-item-lot" className="text-xs font-semibold text-[var(--muted)]">
						Партия (Lot)
					</label>
					<input
						id="inv-item-lot"
						type="text"
						value={formData.lotNumber}
						onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
						className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
						placeholder="номер с упаковки"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label htmlFor="inv-item-exp" className="text-xs font-semibold text-[var(--muted)]">
						Срок годности (FEFO)
					</label>
					<input
						id="inv-item-exp"
						type="date"
						value={formData.expirationDate}
						onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
						className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSaving}
				className="mt-2 h-9 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] text-xs font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
			>
				{isSaving ? "Сохраняем..." : "Сохранить"}
			</button>
		</form>
	);
};

export default InventoryItemFormFields;
