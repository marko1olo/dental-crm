/**
 * MobileInventoryInboundDrawer.tsx
 * DENTE Dental CRM — Нативная iOS Bottom Sheet шторка оприходования партии материалов.
 * Apple HIG Touch Ergonomics, Мандаты 8b, 8e, 8n.
 */

import { CheckCircle2, Minus, Plus, X } from "lucide-react";
import React from "react";
import type { InventoryItem } from "./inventoryDataMappers.js";

export interface MobileInventoryInboundDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly drawerTargetItem: InventoryItem | null;
	readonly items: readonly InventoryItem[];
	readonly drawerQuantity: number;
	readonly setDrawerQuantity: React.Dispatch<React.SetStateAction<number>>;
	readonly drawerLotNumber: string;
	readonly setDrawerLotNumber: (val: string) => void;
	readonly drawerExpDate: string;
	readonly setDrawerExpDate: (val: string) => void;
	readonly onSelectTargetItem: (it: InventoryItem) => void;
	readonly onSubmitInbound: (e: React.FormEvent) => void;
	readonly isSubmittingInbound: boolean;
	readonly onOpenInboundInvoice?: (() => void) | undefined;
	readonly triggerHaptic: () => void;
}

export const MobileInventoryInboundDrawer: React.FC<
	MobileInventoryInboundDrawerProps
> = ({
	isOpen,
	onClose,
	drawerTargetItem,
	items,
	drawerQuantity,
	setDrawerQuantity,
	drawerLotNumber,
	setDrawerLotNumber,
	drawerExpDate,
	setDrawerExpDate,
	onSelectTargetItem,
	onSubmitInbound,
	isSubmittingInbound,
	onOpenInboundInvoice,
	triggerHaptic,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="mobile-inventory-drawer-backdrop"
			onClick={onClose}
			data-testid="mobile-inventory-drawer-backdrop"
		>
			<div
				className="mobile-inventory-drawer-surface"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Оприходование партии на склад"
				data-testid="mobile-inventory-drawer"
			>
				{/* Tactile Drag Handle */}
				<div className="mobile-inventory-drag-handle-wrap">
					<div className="mobile-inventory-drag-handle" />
				</div>

				{/* Drawer Header */}
				<div className="mobile-inventory-drawer-header">
					<div>
						<h2 className="mobile-inventory-drawer-title">
							Оприходовать партию
						</h2>
						<p className="text-xs text-[var(--muted)] m-0">
							{drawerTargetItem
								? drawerTargetItem.name
								: "Поступление расходных материалов"}
						</p>
					</div>

					<button
						type="button"
						className="mobile-inventory-drawer-close"
						onClick={onClose}
						aria-label="Закрыть шторку"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Drawer Body Form */}
				<form onSubmit={onSubmitInbound} className="mobile-inventory-drawer-body">
					{/* Material Selection (if general intake) */}
					{!drawerTargetItem && (
						<div className="mobile-inventory-field-group">
							<label className="mobile-inventory-field-label">
								Материал со склада
							</label>
							<select
								className="mobile-inventory-field-input"
								value={drawerTargetItem ? (drawerTargetItem as InventoryItem).id : ""}
								onChange={(e) => {
									const found = items.find((it) => it.id === e.target.value);
									if (found) {
										onSelectTargetItem(found);
									}
								}}
								data-testid="drawer-material-select"
							>
								<option value="">-- Выберите материал для пополнения --</option>
								{items.map((it) => (
									<option key={it.id} value={it.id}>
										{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."})
									</option>
								))}
							</select>
						</div>
					)}

					{/* Large Quantity Stepper */}
					<div className="text-center">
						<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
							Количество к поступлению
						</span>
						<div className="mobile-inventory-stepper-wrap">
							<button
								type="button"
								className="mobile-inventory-stepper-btn"
								onClick={() => {
									triggerHaptic();
									setDrawerQuantity((prev) => Math.max(1, prev - 1));
								}}
								aria-label="Уменьшить количество на 1"
								data-testid="drawer-stepper-minus"
							>
								<Minus size={20} aria-hidden="true" />
							</button>

							<span
								className="mobile-inventory-stepper-val"
								data-testid="drawer-stepper-value"
							>
								{drawerQuantity}
							</span>

							<button
								type="button"
								className="mobile-inventory-stepper-btn"
								onClick={() => {
									triggerHaptic();
									setDrawerQuantity((prev) => prev + 1);
								}}
								aria-label="Увеличить количество на 1"
								data-testid="drawer-stepper-plus"
							>
								<Plus size={20} aria-hidden="true" />
							</button>
						</div>
					</div>

					{/* Quick Increment Chips: +1, +5, +10, +50, +100 */}
					<div
						className="mobile-inventory-quick-chips-grid"
						data-testid="drawer-quick-chips"
					>
						{[1, 5, 10, 50, 100].map((inc) => (
							<button
								key={inc}
								type="button"
								className="mobile-inventory-quick-chip"
								onClick={() => {
									triggerHaptic();
									setDrawerQuantity((prev) => prev + inc);
								}}
								data-testid={`drawer-chip-plus-${inc}`}
							>
								+{inc}
							</button>
						))}
					</div>

					{/* Batch Number (Lot #) & Expiration Date (FEFO) */}
					<div className="grid grid-cols-2 gap-3">
						<div className="mobile-inventory-field-group">
							<label className="mobile-inventory-field-label">
								Партия / Серия
							</label>
							<input
								type="text"
								className="mobile-inventory-field-input"
								value={drawerLotNumber}
								onChange={(e) => setDrawerLotNumber(e.target.value)}
								placeholder="LOT-2026..."
								data-testid="drawer-input-lot"
							/>
						</div>

						<div className="mobile-inventory-field-group">
							<label className="mobile-inventory-field-label">
								Срок годности (FEFO)
							</label>
							<input
								type="date"
								className="mobile-inventory-field-input"
								value={drawerExpDate}
								onChange={(e) => setDrawerExpDate(e.target.value)}
								data-testid="drawer-input-expdate"
							/>
						</div>
					</div>

					{/* Drawer Sticky Footer with Submit Button */}
					<div className="mobile-inventory-drawer-footer">
						<button
							type="submit"
							disabled={isSubmittingInbound}
							className="mobile-inventory-drawer-submit"
							data-testid="drawer-btn-submit"
						>
							<CheckCircle2 size={20} aria-hidden="true" />
							<span>
								{isSubmittingInbound
									? "Приём на склад..."
									: `Принять на склад • +${drawerQuantity} шт`}
							</span>
						</button>

						{onOpenInboundInvoice && (
							<button
								type="button"
								className="mobile-inventory-drawer-secondary-link"
								onClick={() => {
									onClose();
									onOpenInboundInvoice();
								}}
							>
								Оформить официальную накладную поставщика (ТОРГ-12)
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
};

export default MobileInventoryInboundDrawer;
