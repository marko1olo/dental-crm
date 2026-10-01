import { X } from "lucide-react";
import React from "react";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface InventoryItemFormData {
	name: string;
	threshold: string;
	unitCostRub: string;
	lotNumber: string;
	expirationDate: string;
	sku: string;
	barcode: string;
}

export interface InventoryItemFormModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: InventoryItemFormData;
	readonly setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>> | ((data: InventoryItemFormData) => void);
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly isSaving: boolean;
}

/**
 * Модальное окно добавления и редактирования складского материала (Мандаты 8b, 8d, 8e).
 */
export const InventoryItemFormModal: React.FC<InventoryItemFormModalProps> = ({
	isOpen,
	onClose,
	editingItem,
	formData,
	setFormData,
	onSubmit,
	isSaving,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-base font-bold text-[var(--ink)]">
						{editingItem ? "Редактировать материал" : "Добавить материал"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

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
			</div>
		</div>
	);
};

export default InventoryItemFormModal;
