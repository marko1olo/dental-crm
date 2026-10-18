/**
 * apps/web/src/components/billing/retail/RetailProductCard.tsx
 *
 * Single product card on reception showcase.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Plus, Check, Gift, Barcode } from "lucide-react";
import type { RetailProductItem } from "@dental/shared";

interface RetailProductCardProps {
	readonly product: RetailProductItem;
	readonly currentQty: number;
	readonly isAdded: boolean;
	readonly onQuantityChange: (itemId: string, delta: number) => void;
	readonly onQuickAdd: (item: RetailProductItem) => void;
}

export const RetailProductCard: React.FC<RetailProductCardProps> = ({
	product, currentQty, isAdded, onQuantityChange, onQuickAdd,
}) => {
	const isCert = product.category === "certificates";

	return (
		<div
			className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
				isAdded ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30" : "border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:border-teal-300 hover:shadow-xs"
			}`}
			data-testid={`product-card-${product.id}`}
		>
			<div className="space-y-1">
				<div className="flex items-center justify-between gap-1 text-[11px]">
					<span className="font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400">{product.brand}</span>
					<span
						className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
							isCert ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
						}`}
						title={isCert ? "Подарочный сертификат: Аванс по 54-ФЗ" : "Розничный товар: НДС 20%"}
					>
						{isCert ? "АВАНС / БЕЗ НДС" : "НДС 20%"}
					</span>
				</div>

				<h3 className="font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 text-[var(--ink,#0f172a)] min-h-[36px]">
					{product.name}
				</h3>

				<p className="text-[11px] text-[var(--muted,#64748b)] line-clamp-2 leading-relaxed">
					{product.descriptionRu}
				</p>

				<div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--muted,#64748b)] pt-0.5">
					<span>Арт: {product.sku}</span>
					<span className="flex items-center gap-0.5"><Barcode size={11} /> {product.barcode}</span>
				</div>
			</div>

			<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2">
				<div>
					<span className="text-[10px] text-[var(--muted,#64748b)] block">Цена:</span>
					<span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
						{product.priceRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] p-0.5">
						<button
							type="button" onClick={() => onQuantityChange(product.id, -1)}
							className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							aria-label="Уменьшить количество"
						>
							-
						</button>
						<span className="w-6 text-center font-mono text-xs font-bold">{currentQty}</span>
						<button
							type="button" onClick={() => onQuantityChange(product.id, 1)}
							className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							aria-label="Увеличить количество"
						>
							+
						</button>
					</div>

					<button
						type="button" onClick={() => onQuickAdd(product)}
						className="h-7 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
						style={{
							background: isAdded ? "var(--teal, #0d9488)" : isCert ? "#d97706" : "var(--teal, #0d9488)",
							color: "#ffffff",
						}}
						data-testid={`btn-add-product-${product.id}`}
						title={isCert ? "Добавить сертификат в чек" : "Добавить в чек (НДС 20%)"}
					>
						{isAdded ? (
							<>
								<Check size={13} className="shrink-0 animate-in zoom-in" />
								<span>В чеке</span>
							</>
						) : isCert ? (
							<>
								<Gift size={13} className="shrink-0" />
								<span>В чек</span>
							</>
						) : (
							<>
								<Plus size={13} className="shrink-0" />
								<span>В чек</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
