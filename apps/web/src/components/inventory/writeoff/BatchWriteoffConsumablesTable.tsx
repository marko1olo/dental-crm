/**
 * apps/web/src/components/inventory/writeoff/BatchWriteoffConsumablesTable.tsx
 *
 * Сгруппированный перечень расходных материалов со статусом остатка
 * и индикацией мягкого овердрафта (Мандаты 8e, 8n, 8am).
 */

import React from "react";
import {
	resolveShiftItemTier,
	type ShiftConsumableItem,
} from "./useConsumablesBatchWriteoff.js";

export interface BatchWriteoffConsumablesTableProps {
	readonly consumables: readonly ShiftConsumableItem[];
	readonly onToggleOmit?: ((itemId: string) => void) | undefined;
	readonly onAdjustQuantity?: ((itemId: string, nextQty: number) => void) | undefined;
}

export const BatchWriteoffConsumablesTable: React.FC<BatchWriteoffConsumablesTableProps> = ({
	consumables,
	onToggleOmit,
	onAdjustQuantity,
}) => {
	const clinicalItems = consumables.filter(
		(item) => resolveShiftItemTier(item) === "expensive_clinical",
	);
	const overheadItems = consumables.filter(
		(item) => resolveShiftItemTier(item) === "cheap_overhead",
	);

	const renderRow = (item: ShiftConsumableItem) => {
		const tier = resolveShiftItemTier(item);
		const canOmit = item.canOmit ?? tier === "expensive_clinical";
		const canAdjust = item.canAdjustQuantity ?? tier === "expensive_clinical";
		const isOmitted = Boolean(canOmit && item.isOmitted);

		return (
			<div
				key={item.itemId}
				data-testid={`writeoff-row-${item.itemId}`}
				className={`p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-[var(--paper-soft,#f8fafc)]/60 transition-colors ${isOmitted ? "opacity-60" : ""}`}
			>
				<div className="flex-1 min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className={`font-medium text-[var(--ink,#0f172a)] break-words leading-snug ${isOmitted ? "line-through" : ""}`}>
							{item.itemName}
						</span>
						<span className="h-5 px-2 text-[11px] font-medium rounded-full inline-flex items-center bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)] shrink-0">
							{tier === "expensive_clinical" ? "Клинический" : "Общеклинический"}
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{item.category && (
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								{item.category}
							</span>
						)}
						{canOmit && onToggleOmit && (
							<button
								type="button"
								data-testid={`writeoff-vn-toggle-${item.itemId}`}
								onClick={() => onToggleOmit(item.itemId)}
								className={`h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 border cursor-pointer shrink-0 ${
									isOmitted
										? "bg-[var(--warning-soft)] text-[var(--warning-ink)] border-[var(--warning)]"
										: "bg-[var(--paper)] text-[var(--ink-muted)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								title="ВН — возможность не использовать позицию на приёме"
							>
								{isOmitted ? "ВН: Исключено" : "ВН: Не исп."}
							</button>
						)}
						{canAdjust && onAdjustQuantity && !isOmitted && (
							<div className="inline-flex items-center gap-1" data-testid={`writeoff-vi-controls-${item.itemId}`}>
								<button
									type="button"
									data-testid={`writeoff-vi-minus-${item.itemId}`}
									onClick={() => onAdjustQuantity(item.itemId, Math.max(0.5, item.qtyToDeduct - 0.5))}
									className="h-7 px-2 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0"
									title="ВИ: уменьшить фактический расход"
								>
									−
								</button>
								<span className="px-1 font-mono text-[11px] font-semibold text-[var(--ink)]">
									ВИ: {item.qtyToDeduct}
								</span>
								<button
									type="button"
									data-testid={`writeoff-vi-plus-${item.itemId}`}
									onClick={() => onAdjustQuantity(item.itemId, item.qtyToDeduct + 0.5)}
									className="h-7 px-2 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0"
									title="ВИ: увеличить фактический расход"
								>
									+
								</button>
							</div>
						)}
					</div>
				</div>
				<div className="text-right shrink-0">
					<div className="font-bold text-[var(--ink,#0f172a)] font-mono tabular-nums">
						{isOmitted ? `0 ${item.unit}` : `-${item.qtyToDeduct} ${item.unit}`}
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)]">
						Остаток: {item.currentStock} ➔{" "}
						{item.isOverdraft ? (
							<span className="font-bold text-[var(--warning)]">
								⚠️ {item.projectedStock} (дефицит)
							</span>
						) : (
							<span className="font-semibold text-[var(--success)]">
								{item.projectedStock}
							</span>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div data-testid="batch-writeoff-table" className="border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)]">
			<div className="p-2.5 sm:p-3 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs font-semibold">
				<span>Материалы по техкартам ({consumables.length})</span>
				<span className="text-[var(--muted,#64748b)] font-normal">Списание ➔ Остаток</span>
			</div>
			<div className="divide-y divide-[var(--line-subtle,#f1f5f9)] max-h-[260px] overflow-y-auto">
				{clinicalItems.length > 0 && (
					<div className="px-3 py-1.5 bg-[var(--paper-soft)]/70 text-[11px] font-semibold text-[var(--ink-muted)]">
						Уровень 2 · Дорогостоящие клинические материалы (ВН/ВИ) — {clinicalItems.length}
					</div>
				)}
				{clinicalItems.map(renderRow)}
				{overheadItems.length > 0 && (
					<div className="px-3 py-1.5 bg-[var(--paper-soft)]/70 text-[11px] font-semibold text-[var(--ink-muted)]">
						Уровень 1 · Общеклинические расходники (фоновый норматив) — {overheadItems.length}
					</div>
				)}
				{overheadItems.map(renderRow)}
			</div>
		</div>
	);
};
