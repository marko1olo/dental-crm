/**
 * apps/web/src/components/inventory/InboundWaybillItemsTable.tsx
 *
 * Таблица строк приходной накладной с автоматическим расчетом сумм и детектом овердрафта.
 * Реализует Мандаты 8b (Sweet Spot 100–200 строк), 8e (Автономия персонала), 8n и 8am (Дизайн-токены).
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
	readonly onUpdateLine: (id: string, field: "name" | "quantity" | "priceRub" | "unit" | "lotNumber" | "expirationDate", val: string | number) => void;
	readonly datalistId?: string;
}

export const InboundWaybillItemsTable: React.FC<InboundWaybillItemsTableProps> = ({
	lines,
	inventoryItems,
	onAddLine,
	onRemoveLine,
	onUpdateLine,
	datalistId,
}) => {
	return (
		<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
			<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between text-xs font-semibold">
				<span className="text-[var(--ink)]">Товары из каталога склада ({lines.length}) • FEFO контроль</span>
				<button
					type="button"
					onClick={onAddLine}
					className="secondary-button px-2.5 py-1 text-xs flex items-center gap-1 font-medium"
					data-testid="btn-add-invoice-line"
				>
					<Plus size={14} />
					<span>Добавить строку</span>
				</button>
			</div>

			<div className="divide-y divide-[var(--line-subtle)] max-h-[260px] overflow-y-auto">
				{lines.map((line, idx) => {
					const matched = inventoryItems.find((it) => it.name.toLowerCase() === line.name.toLowerCase());
					const currentStock = matched ? Number(matched.stockQuantity ?? matched.currentQty ?? 0) : null;
					const hasOverdraft = currentStock !== null && currentStock < 0;
					const priceVal = line.priceRub ?? (line.unitCostRub ? Number(line.unitCostRub) : 0);

					return (
						<div key={line.id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs hover:bg-[var(--paper-soft)]/50">
							<span className="text-[var(--muted)] font-mono text-[11px] w-5 shrink-0 hidden sm:block">
								{idx + 1}.
							</span>
							<div className="flex-1 min-w-[200px]">
								<input
									type="text"
									value={line.name}
									onChange={(e) => onUpdateLine(line.id, "name", e.target.value)}
									placeholder="Выберите наименование..."
									list={datalistId}
									className="w-full px-2.5 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] focus:outline-none"
									data-testid={`invoice-item-name-${idx}`}
								/>
								{hasOverdraft && (
									<span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[var(--warning)] font-medium">
										⚡ Дефицит у кресла: {currentStock} {matched?.unit || "шт."} (овердрафт)
									</span>
								)}
								<div className="text-[10px] text-[var(--muted)] mt-0.5 font-mono">
									Партия FEFO: {line.lotNumber || "SEPT-2026-A"} | Годен до: {line.expirationDate || "2028-12-31"}
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
										className="w-full px-2 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] text-right font-mono"
										data-testid={`invoice-item-qty-${idx}`}
									/>
								</div>
								<span className="w-10 text-[var(--muted)] text-center">{line.unit || "шт."}</span>
								<div className="w-28 flex items-center gap-1">
									<input
										type="number"
										min="0"
										step="0.01"
										value={priceVal}
										onChange={(e) => onUpdateLine(line.id, "priceRub", Number(e.target.value))}
										placeholder="Цена ₽"
										className="w-full px-2 py-1.5 text-xs bg-[var(--paper)] text-[var(--ink)] rounded-md border border-[var(--line)] text-right font-mono font-bold"
										data-testid={`invoice-item-price-${idx}`}
									/>
									<span className="text-[var(--muted)]">₽</span>
								</div>
								<div className="w-24 font-mono font-semibold text-right text-[var(--ink)] shrink-0 hidden md:block">
									{((Number(line.quantity) || 0) * (Number(priceVal) || 0)).toLocaleString("ru-RU")} ₽
								</div>
								<button
									type="button"
									onClick={() => {
										if (lines.length > 1) {
											onRemoveLine(line.id);
										} else {
											onUpdateLine(line.id, "name", "");
											onUpdateLine(line.id, "quantity", 1);
											onUpdateLine(line.id, "priceRub", 0);
										}
									}}
									className="secondary-button p-1.5 text-[var(--danger)] hover:opacity-80 transition-opacity"
									title={lines.length <= 1 ? "Очистить строку" : "Удалить строку"}
								>
									<Trash2 size={14} />
								</button>
							</div>
						</div>
					);
				})}
			</div>
			{datalistId && (
				<datalist id={datalistId}>
					{inventoryItems.map((it) => (
						<option key={it.id} value={it.name}>
							{it.name}
						</option>
					))}
				</datalist>
			)}
		</div>
	);
};

export default InboundWaybillItemsTable;
