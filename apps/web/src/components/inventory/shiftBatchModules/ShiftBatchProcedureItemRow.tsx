import type React from "react";
import { Minus, Plus } from "lucide-react";
import type { ConsumablesDeductionModalItem } from "../deductionModalModules/deductionModalTypes.js";

export type ConsumableDeductionItem = ConsumablesDeductionModalItem;

export interface ShiftBatchProcedureItemRowProps {
	readonly item: ConsumableDeductionItem;
	readonly onUpdateQty: (id: string, qty: number) => void;
}

export const ShiftBatchProcedureItemRow: React.FC<ShiftBatchProcedureItemRowProps> = ({
	item,
	onUpdateQty,
}) => {
	return (
		<div
			className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--paper-soft)] transition-colors"
			data-testid={`procedure-item-${item.id}`}
		>
			<div className="space-y-0.5 min-w-0 flex-1">
				<div className="font-semibold text-[var(--ink)] truncate">{item.itemName}</div>
				<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 flex-wrap">
					<span>Категория: {item.category}</span>
					<span>•</span>
					<span className={item.isOverdraft ? "text-amber-600 font-semibold" : ""}>
						Остаток на складе: {item.currentStock} {item.unit}
					</span>
					{item.isOverdraft && (
						<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
							Дефицит
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div className="flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper)] overflow-hidden">
					<button
						type="button"
						onClick={() => onUpdateQty(item.id, Math.max(0, item.deductedQty - 1))}
						className="w-7 h-7 flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer"
						title="Уменьшить"
					>
						<Minus size={13} />
					</button>
					<span className="w-9 text-center font-bold font-mono text-xs tabular-nums text-[var(--ink)]">
						{item.deductedQty}
					</span>
					<button
						type="button"
						onClick={() => onUpdateQty(item.id, item.deductedQty + 1)}
						className="w-7 h-7 flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer"
						title="Увеличить"
					>
						<Plus size={13} />
					</button>
				</div>
				<span className="text-[11px] text-[var(--muted)] min-w-[52px] whitespace-nowrap text-left">
					{item.unit}
				</span>
			</div>
		</div>
	);
};
