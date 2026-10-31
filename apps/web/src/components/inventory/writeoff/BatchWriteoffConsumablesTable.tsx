/**
 * apps/web/src/components/inventory/writeoff/BatchWriteoffConsumablesTable.tsx
 *
 * Сгруппированный перечень расходных материалов со статусом остатка
 * и индикацией мягкого овердрафта (Мандаты 8e, 8n, 8am).
 */

import React from "react";
import type { ShiftConsumableItem } from "./useConsumablesBatchWriteoff.js";

export interface BatchWriteoffConsumablesTableProps {
	readonly consumables: readonly ShiftConsumableItem[];
}

export const BatchWriteoffConsumablesTable: React.FC<BatchWriteoffConsumablesTableProps> = ({
	consumables,
}) => {
	return (
		<div className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
			<div className="p-2.5 sm:p-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-semibold">
				<span>Материалы по техкартам ({consumables.length})</span>
				<span className="text-[var(--muted,#64748b)] font-normal">Списание ➔ Остаток</span>
			</div>
			<div className="divide-y divide-[var(--line-subtle,#f1f5f9)] max-h-[220px] overflow-y-auto">
				{consumables.map((item) => (
					<div
						key={item.itemId}
						className="p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--paper-soft,#f8fafc)]/60 transition-colors"
					>
						<div className="flex-1 min-w-0">
							<div className="font-medium text-[var(--ink,#0f172a)] truncate">
								{item.itemName}
							</div>
							{item.category && (
								<span className="text-[11px] text-[var(--muted,#64748b)]">
									{item.category}
								</span>
							)}
						</div>
						<div className="text-right shrink-0">
							<div className="font-bold text-[var(--ink,#0f172a)] font-mono">
								-{item.qtyToDeduct} {item.unit}
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								Остаток: {item.currentStock} ➔{" "}
								{item.isOverdraft ? (
									<span className="font-bold text-amber-600 dark:text-amber-400">
										⚠️ {item.projectedStock} (дефицит)
									</span>
								) : (
									<span className="font-semibold text-emerald-600 dark:text-emerald-400">
										{item.projectedStock}
									</span>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
