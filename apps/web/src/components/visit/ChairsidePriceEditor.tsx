/**
 * ChairsidePriceEditor.tsx
 * Quantity stepper and inline price adjustment (+500 ₽ / -500 ₽).
 */

import React from "react";
import { Minus, Plus } from "lucide-react";
import type { VisitBillingServiceItem } from "./visitBillingTypes.js";

interface ChairsidePriceEditorProps {
	item: VisitBillingServiceItem;
	onQuantityChange: (id: string, delta: number) => void;
	onStepPrice: (id: string, delta: number) => void;
	onPriceChange: (id: string, newPrice: number) => void;
}

export const ChairsidePriceEditor: React.FC<ChairsidePriceEditorProps> = ({
	item,
	onQuantityChange,
	onStepPrice,
	onPriceChange,
}) => {
	return (
		<div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
			{/* Quantity Stepper */}
			<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper,#ffffff)] overflow-hidden">
				<button
					type="button"
					onClick={() => onQuantityChange(item.id, -1)}
					title="Уменьшить количество"
					className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
					data-testid={`btn-qty-minus-${item.id}`}
				>
					<Minus size={12} />
				</button>
				<span className="w-8 text-center text-xs font-bold font-mono">
					{item.quantity}
				</span>
				<button
					type="button"
					onClick={() => onQuantityChange(item.id, 1)}
					title="Увеличить количество"
					className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
					data-testid={`btn-qty-plus-${item.id}`}
				>
					<Plus size={12} />
				</button>
			</div>

			{/* Inline Price Editing with Step Buttons */}
			<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
				<button
					type="button"
					onClick={() => onStepPrice(item.id, -500)}
					title={item.unitPriceRub <= 0 ? "Минимальная цена 0 ₽" : "Снизить цену на 500 ₽"}
					className="h-7 px-1.5 sm:px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
					data-testid={`btn-step-minus-500-${item.id}`}
				>
					-500 ₽
				</button>

				<div className="relative flex items-center">
					<input
						type="number"
						min={0}
						step={100}
						value={item.unitPriceRub}
						onChange={(e) => onPriceChange(item.id, Number(e.target.value) || 0)}
						className="h-7 w-16 sm:w-20 px-1 sm:px-2 text-xs font-bold font-mono text-right bg-transparent border-0 outline-none text-[var(--ink,#0f172a)]"
						data-testid={`input-unit-price-${item.id}`}
						title="Прямое редактирование цены услуги"
					/>
					<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)] pr-1">₽</span>
				</div>

				<button
					type="button"
					onClick={() => onStepPrice(item.id, 500)}
					title="Увеличить цену на 500 ₽"
					className="h-7 px-1.5 sm:px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
					data-testid={`btn-step-plus-500-${item.id}`}
				>
					+500 ₽
				</button>
			</div>
		</div>
	);
};
