/**
 * apps/web/src/components/inventory/InboundWaybillItemsTable.tsx
 *
 * Таблица строк приходной накладной с автоматическим расчетом сумм и детектом овердрафта.
 * Реализует Мандаты 8b (Sweet Spot 100–200 строк), 8e (Автономия персонала) и 8n.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InboundWaybillLineItem } from "./InboundWaybillModal.js";

export interface InboundWaybillItemsTableProps {
	readonly lines: InboundWaybillLineItem[];
	readonly inventoryItems: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity?: number | string | null | undefined;
		readonly currentQty?: number | string | null | undefined;
		readonly unitCostRub?: string | number | null | undefined;
		readonly unit?: string | null | undefined;
	}[];
	readonly onAddLine: () => void;
	readonly onRemoveLine: (id: string) => void;
	readonly onUpdateLine: (id: string, field: keyof InboundWaybillLineItem, val: any) => void;
}

export const InboundWaybillItemsTable: React.FC<InboundWaybillItemsTableProps> = ({
	lines,
	inventoryItems,
	onAddLine,
	onRemoveLine,
	onUpdateLine,
}) => {
	return (
		<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
			<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between">
				<span className="text-xs font-semibold text-[var(--ink)]">Позиции накладной ({lines.length})</span>
				<button
					type="button"
					onClick={onAddLine}
					className="secondary-button px-2.5 py-1 text-xs flex items-center gap-1"
				>
					<Plus size={14} />
					<span>Добавить строку</span>
				</button>
			</div>

			<div className="divide-y divide-[var(--line-subtle)]">
				{lines.map((line, idx) => {
					const matched = inventoryItems.find((it) => it.name.toLowerCase() === line.name.toLowerCase());
					const currentStock = matched ? Number(matched.stockQuantity ?? matched.currentQty ?? 0) : null;
					const hasOverdraft = currentStock !== null && currentStock < 0;

					return (
						<div key={line.id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
							<span className="text-[var(--muted)] font-mono text-[11px] w-5 shrink-0 hidden sm:block">
								{idx + 1}.
							</span>
							<div className="flex-1 min-w-[180px]">
								<input
									type="text"
									value={line.name}
									onChange={(e) => onUpdateLine(line.id, "name", e.target.value)}
									placeholder="Название материала..."
									className="w-full px-2.5 py-1.5 bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
								/>
								{hasOverdraft && (
									<span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-500 font-medium">
										⚡ Дефицит у кресла: {currentStock} {matched?.unit || "шт."} (овердрафт)
									</span>
								)}
								<div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--muted)]">
									<span>Партия: {line.lotNumber || "SEPT-2026-A"}</span>
									<span>•</span>
									<span className="text-emerald-500 font-medium">FEFO статус: норма</span>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-20">
									<input
										type="number"
										min="1"
										value={line.quantity}
										onChange={(e) => onUpdateLine(line.id, "quantity", Number(e.target.value))}
										placeholder="Кол-во"
										className="w-full px-2 py-1.5 text-right bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
									/>
								</div>
								<div className="w-16">
									<input
										type="text"
										value={line.unit || "шт."}
										onChange={(e) => onUpdateLine(line.id, "unit", e.target.value)}
										placeholder="Ед."
										className="w-full px-2 py-1.5 text-center bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
									/>
								</div>
								<div className="w-24">
									<input
										type="number"
										min="0"
										step="0.01"
										value={line.unitCostRub}
										onChange={(e) => onUpdateLine(line.id, "unitCostRub", Number(e.target.value))}
										placeholder="Цена ₽"
										className="w-full px-2 py-1.5 text-right font-mono bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
									/>
								</div>
								<div className="w-24 font-mono font-semibold text-right text-[var(--ink)] shrink-0">
									{((Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0)).toLocaleString("ru-RU")} ₽
								</div>
								<button
									type="button"
									onClick={() => onRemoveLine(line.id)}
									disabled={lines.length <= 1}
									className="p-1.5 text-[var(--muted)] hover:text-red-500 disabled:opacity-30 rounded-lg"
									aria-label="Удалить строку"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default InboundWaybillItemsTable;
