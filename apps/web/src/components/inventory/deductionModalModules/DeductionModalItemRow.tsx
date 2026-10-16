import { AlertTriangle, Minus, Plus } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import {
	formatCategoryRu,
	formatUnitRu,
	type ConsumablesDeductionModalItem,
} from "./deductionModalTypes.js";

export interface DeductionModalItemRowProps {
	readonly item: ConsumablesDeductionModalItem;
	readonly onUpdateQty: (itemId: string, delta: number) => void;
}

export const DeductionModalItemRow: React.FC<DeductionModalItemRowProps> = ({
	item,
	onUpdateQty,
}) => {
	const remaining = Math.round((item.currentStock - item.deductedQty) * 10) / 10;
	const isOverdraft = remaining < 0;

	return (
		<div
			className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
				isOverdraft
					? "border-amber-500/30 bg-amber-500/5"
					: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
			}`}
			data-testid={`deduction-item-row-${item.inventoryItemId}`}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-semibold text-xs sm:text-sm text-[var(--ink)] leading-tight">
						{item.itemName}
					</span>
					<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						{formatCategoryRu(item.category)}
					</span>
				</div>
				<div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1 flex-wrap">
					<span>
						Остаток в кабинете:{" "}
						<strong className={item.currentStock <= 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-[var(--ink)]"}>
							{item.currentStock} {formatUnitRu(item.unit)}
						</strong>
					</span>
					<span>
						Себестоимость:{" "}
						<strong className="text-[var(--ink)]">
							{money(item.unitCostRub)} / {formatUnitRu(item.unit)}
						</strong>
					</span>
					{isOverdraft && (
						<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
							<AlertTriangle size={11} />
							Остаток 0 — требуется заказ
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 self-end sm:self-center shrink-0">
				<div className="flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper-soft)] p-0.5">
					<button
						type="button"
						onClick={() => onUpdateQty(item.id, -1)}
						className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
						aria-label={`Уменьшить количество ${item.itemName}`}
						data-testid={`btn-decrease-qty-${item.inventoryItemId}`}
					>
						<Minus size={13} />
					</button>
					<span
						className="w-12 text-center text-xs font-bold text-[var(--ink)]"
						data-testid={`qty-value-${item.inventoryItemId}`}
					>
						{item.deductedQty}
					</span>
					<button
						type="button"
						onClick={() => onUpdateQty(item.id, 1)}
						className="h-8 w-8 sm:h-7 sm:w-7 min-h-[32px] min-w-[32px] rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
						aria-label={`Увеличить количество ${item.itemName}`}
						data-testid={`btn-increase-qty-${item.inventoryItemId}`}
					>
						<Plus size={13} />
					</button>
				</div>
				<span className="text-xs text-[var(--muted)] min-w-[52px] text-left font-medium">
					{formatUnitRu(item.unit)}
				</span>
				<span className="text-xs font-bold text-teal-700 dark:text-teal-300 w-20 text-right">
					{money(Math.round(item.deductedQty * item.unitCostRub * 100) / 100)}
				</span>
			</div>
		</div>
	);
};
