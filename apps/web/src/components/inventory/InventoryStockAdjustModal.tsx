import {
	ArrowDownToLine,
	ArrowUpFromLine,
	X,
} from "lucide-react";
import React, { useMemo } from "react";
import type { InventoryItem } from "./useInventoryLogic.js";

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
			return {
				adjustHasAmount: false,
				adjustResultQuantity: 0,
				adjustExceedsStock: false,
			};
		}
		const parsed = Number.parseInt(adjustAmount, 10);
		const hasAmt = Number.isFinite(parsed) && parsed > 0;
		const delta = (adjustType === "in" ? 1 : -1) * (hasAmt ? parsed : 0);
		const resultQty = adjustingItem.stockQuantity + delta;
		const exceeds = Boolean(adjustType === "out" && resultQty < 0);

		return {
			adjustHasAmount: hasAmt,
			adjustResultQuantity: resultQty,
			adjustExceedsStock: exceeds,
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

				<div className="flex gap-2 mb-4">
					{(["in", "out"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setAdjustType(t)}
							className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 border transition-all ${
								adjustType === t
									? t === "in"
										? "bg-[var(--teal-soft)] border-teal-500 text-teal-700 dark:text-teal-300 font-bold"
										: "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold"
									: "bg-transparent border-[var(--line)] text-[var(--muted)]"
							}`}
						>
							{t === "in" ? (
								<>
									<ArrowDownToLine size={13} /> <span>Приход</span>
								</>
							) : (
								<>
									<ArrowUpFromLine size={13} /> <span>Списание</span>
								</>
							)}
						</button>
					))}
				</div>

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
							Внимание: остаток отрицательный (овердрафт). Задержка оприходования накладной поставщика не блокирует оказание помощи.
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
									? "Списать (Мягкий овердрафт)"
									: "Списать"}
					</button>
				</form>
			</div>
		</div>
	);
};

export default InventoryStockAdjustModal;
