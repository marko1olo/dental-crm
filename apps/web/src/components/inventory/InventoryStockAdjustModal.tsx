import { X } from "lucide-react";
import React, { useMemo } from "react";
import type { InventoryItem } from "./useInventoryLogic.js";
import { InventoryStockAdjustForm } from "./InventoryStockAdjustForm.js";
import { InventoryStockAdjustTypeToggle } from "./InventoryStockAdjustTypeToggle.js";

export interface InventoryStockAdjustModalProps {
	readonly adjustingItem: InventoryItem | null;
	readonly onClose: () => void;
	readonly adjustType: "in" | "out";
	readonly setAdjustType: (type: "in" | "out") => void;
	readonly adjustAmount: string;
	readonly setAdjustAmount: (amount: string) => void;
	readonly onAdjustSubmit: (e: React.FormEvent) => void;
	readonly isAdjusting: boolean;
}

/**
 * Модальное окно ручной корректировки остатков (приход / списание / мягкий овердрафт)
 * (Мандаты 8b, 8d, 8e, 8n).
 */
export const InventoryStockAdjustModal: React.FC<InventoryStockAdjustModalProps> = ({
	adjustingItem,
	onClose,
	adjustType,
	setAdjustType,
	adjustAmount,
	setAdjustAmount,
	onAdjustSubmit,
	isAdjusting,
}) => {
	const {
		adjustHasAmount,
		adjustResultQuantity,
		adjustExceedsStock,
	} = useMemo(() => {
		if (!adjustingItem) {
			return { adjustHasAmount: false, adjustResultQuantity: 0, adjustExceedsStock: false };
		}
		const parsed = Number.parseInt(adjustAmount, 10);
		const hasAmt = Number.isFinite(parsed) && parsed > 0;
		const delta = (adjustType === "in" ? 1 : -1) * (hasAmt ? parsed : 0);
		const resultQty = adjustingItem.stockQuantity + delta;
		return {
			adjustHasAmount: hasAmt,
			adjustResultQuantity: resultQty,
			adjustExceedsStock: Boolean(adjustType === "out" && resultQty < 0),
		};
	}, [adjustAmount, adjustType, adjustingItem]);

	if (!adjustingItem) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-sm p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center mb-3">
					<h2 className="text-base font-bold text-[var(--ink)]">
						{adjustType === "in" ? "Приход на склад" : "Списание со склада"}
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

				<p className="text-xs text-[var(--muted)] mb-0.5">Материал</p>
				<p className="text-sm font-bold text-teal-600 dark:text-teal-400 mb-3">
					{adjustingItem.name}
				</p>
				<p className="text-xs text-[var(--muted)] mb-3">
					Текущий остаток:{" "}
					<strong className="text-[var(--ink)] font-mono">
						{adjustingItem.stockQuantity} {adjustingItem.unit || "шт."}
					</strong>
				</p>

				<InventoryStockAdjustTypeToggle adjustType={adjustType} setAdjustType={setAdjustType} />

				<InventoryStockAdjustForm
					adjustingItem={adjustingItem}
					adjustType={adjustType}
					adjustAmount={adjustAmount}
					setAdjustAmount={setAdjustAmount}
					onAdjustSubmit={onAdjustSubmit}
					isAdjusting={isAdjusting}
					adjustHasAmount={adjustHasAmount}
					adjustResultQuantity={adjustResultQuantity}
					adjustExceedsStock={adjustExceedsStock}
				/>
			</div>
		</div>
	);
};

export default InventoryStockAdjustModal;
