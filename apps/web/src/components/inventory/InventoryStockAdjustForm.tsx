import React from "react";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface InventoryStockAdjustFormProps {
	readonly adjustingItem: InventoryItem;
	readonly adjustType: "in" | "out";
	readonly adjustAmount: string;
	readonly setAdjustAmount: (amount: string) => void;
	readonly onAdjustSubmit: (e: React.FormEvent) => void;
	readonly isAdjusting: boolean;
	readonly adjustHasAmount: boolean;
	readonly adjustResultQuantity: number;
	readonly adjustExceedsStock: boolean;
}

export const InventoryStockAdjustForm: React.FC<InventoryStockAdjustFormProps> = ({
	adjustingItem,
	adjustType,
	adjustAmount,
	setAdjustAmount,
	onAdjustSubmit,
	isAdjusting,
	adjustHasAmount,
	adjustResultQuantity,
	adjustExceedsStock,
}) => {
	return (
		<form onSubmit={onAdjustSubmit} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<label htmlFor="inv-adjust-amount" className="text-xs font-semibold text-[var(--muted)]">
					Количество ({adjustingItem.unit || "шт."})
				</label>
				<input
					id="inv-adjust-amount"
					type="number"
					min="1"
					required
					value={adjustAmount}
					onChange={(e) => setAdjustAmount(e.target.value)}
					className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xl text-center font-bold text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
				/>
			</div>

			{adjustHasAmount && (
				<p className="text-xs text-center text-[var(--muted)]">
					Будет:{" "}
					<strong
						className={`font-mono ${
							adjustExceedsStock ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"
						}`}
					>
						{adjustResultQuantity} {adjustingItem.unit || "шт."}
						{adjustExceedsStock ? " (дефицит)" : ""}
					</strong>
				</p>
			)}

			{adjustExceedsStock && (
				<div
					className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs leading-relaxed"
					data-testid="adjust-stock-overdraft-warning"
				>
					Внимание: остаток отрицательный (списание с дефицитом). Задержка оприходования накладной поставщика не блокирует оказание помощи.
				</div>
			)}

			<button
				type="submit"
				disabled={isAdjusting}
				className={`h-9 rounded-lg text-xs font-bold text-white cursor-pointer transition-all ${
					adjustType === "in" ? "bg-[var(--teal)]" : "bg-rose-600 hover:bg-rose-700"
				} disabled:opacity-50`}
			>
				{isAdjusting
					? "Сохраняем..."
					: adjustType === "in"
						? "Оприходовать"
						: adjustExceedsStock
							? "Списать (с дефицитом)"
							: "Списать"}
			</button>
		</form>
	);
};

export default InventoryStockAdjustForm;
