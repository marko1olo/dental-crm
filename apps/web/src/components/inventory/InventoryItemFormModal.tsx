/**
 * apps/web/src/components/inventory/InventoryItemFormModal.tsx
 *
 * Каноническая карточка материала склада и редактирования номенклатуры (Мандаты 8b, 8d, 8e, 8am).
 * Единый монолитный компонент без микро-шредера (~150L).
 */

import React from "react";
import { AlertCircle, Box, Check, X } from "lucide-react";
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

	const isNegativeOverdraft = editingItem && Number(editingItem.stockQuantity ?? 0) < 0;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inv-item-form-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
			data-testid="inventory-item-form-modal"
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка карточки */}
				<div className="flex justify-between items-center pb-2 border-b border-[var(--line-subtle)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center">
							<Box size={18} />
						</div>
						<div>
							<h2 id="inv-item-form-title" className="text-base font-bold text-[var(--ink)]">
								{editingItem ? "Карточка материала" : "Новый материал"}
							</h2>
							<p className="text-xs text-[var(--muted)] m-0">Номенклатурный справочник склада</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button p-2 text-[var(--muted)] hover:text-[var(--ink)]"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Индикатор мягкого овердрафта (Мандат 8e, 8n) */}
				{isNegativeOverdraft && (
					<div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
						<AlertCircle size={15} className="shrink-0" />
						<span>Текущий дефицит: <strong>{editingItem.stockQuantity} ед.</strong> (мягкий овердрафт приёма). Списание разрешено.</span>
					</div>
				)}

				{/* Поля формы */}
				<form onSubmit={onSubmit} className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<label htmlFor="inv-item-name" className="text-xs font-semibold text-[var(--muted)]">
							Наименование материала *
						</label>
						<input
							id="inv-item-name"
							type="text"
							required
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)]"
							placeholder="Септанест, Filtek Ultimate, Нитриловые перчатки..."
							data-testid="inv-item-name-input"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label htmlFor="inv-item-threshold" className="text-xs font-semibold text-[var(--muted)]">
								Мин. остаток (порог)
							</label>
							<input
								id="inv-item-threshold"
								type="number"
								min="0"
								required
								value={formData.threshold}
								onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
								className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)]"
								placeholder="5"
								data-testid="inv-item-threshold-input"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor="inv-item-price" className="text-xs font-semibold text-[var(--muted)]">
								Цена за ед. (₽)
							</label>
							<input
								id="inv-item-price"
								type="text"
								inputMode="decimal"
								value={formData.unitCostRub}
								onChange={(e) => setFormData({ ...formData, unitCostRub: e.target.value })}
								className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)]"
								placeholder="1200"
								data-testid="inv-item-price-input"
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
								className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)] font-mono"
								placeholder="LOT-2026-X"
								data-testid="inv-item-lot-input"
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
								className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] outline-none focus:border-[var(--teal,#0d9488)] font-mono"
								data-testid="inv-item-exp-input"
							/>
						</div>
					</div>

					{/* Футер: 1 Primary CTA кнопка var(--teal) */}
					<div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t border-[var(--line-subtle)]">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="secondary-button px-4 py-2 text-xs font-medium"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="primary-button px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
							style={{ background: "var(--teal, #0d9488)", color: "#ffffff", height: "36px" }}
							data-testid="btn-save-inventory-item"
						>
							<Check size={15} />
							<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default InventoryItemFormModal;
