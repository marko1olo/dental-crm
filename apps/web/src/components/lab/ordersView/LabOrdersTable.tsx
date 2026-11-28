import React, { useState, useMemo, useCallback } from "react";
import { Truck, Printer, X, CheckSquare, Loader2 } from "lucide-react";
import { escapeHtml } from "@dental/shared";
import type { LabOrdersTableProps } from "./types";
import { LabOrdersTableHeader } from "./LabOrdersTableHeader";
import { LabOrdersTableRow } from "./LabOrdersTableRow";
import type { DentalLabOrderData } from "../labMath";

export function generateBatchRegistryPrintHtml(orders: readonly DentalLabOrderData[]): string {
	const rows = orders.map((o, idx) => {
		const orderCode = escapeHtml(o.orderNumber || o.id || "—");
		const patientName = escapeHtml(o.patientName || "—");
		const doctorName = escapeHtml(o.doctorName || "—");
		const toothText = o.toothFdi ? `№ ${escapeHtml(o.toothFdi)}` : "—";
		const construction = escapeHtml(o.constructionType || "—");
		const materialText = o.material ? ` (${escapeHtml(o.material)})` : "";
		const colorVita = escapeHtml(o.colorVita || "—");
		const dueDateText = o.dueDate ? escapeHtml(new Date(o.dueDate).toLocaleDateString("ru-RU")) : "—";
		return `
		<tr>
			<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${idx + 1}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${orderCode}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;">${patientName}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;">${doctorName}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${toothText}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;">${construction}${materialText}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${colorVita}</td>
			<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${dueDateText}</td>
		</tr>
	`;
	}).join("");

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Реестр нарядов ЗТЛ для курьера</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 8px; font-size: 11px; }
		h1 { font-size: 16px; margin: 0 0 4px 0; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 11px; }
		.signatures { margin-top: 30px; display: table; width: 100%; }
		.sig-col { display: table-cell; width: 33.3%; text-align: center; }
		.sig-line { border-bottom: 1px solid #0f172a; margin: 30px 20px 4px 20px; }
	</style></head><body>
		<h1>Реестр передачи заказ-нарядов ЗТЛ курьеру</h1>
		<p>Дата формирования: ${new Date().toLocaleDateString("ru-RU")} • Передано нарядов: ${orders.length}</p>
		<table>
			<thead>
				<tr>
					<th style="width:30px;text-align:center;">№</th>
					<th>№ Наряда</th>
					<th>Пациент</th>
					<th>Врач</th>
					<th style="text-align:center;">Зуб</th>
					<th>Конструкция / Материал</th>
					<th style="text-align:center;">VITA</th>
					<th style="text-align:center;">Срок сдачи</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
		<div class="signatures">
			<div class="sig-col"><div class="sig-line"></div><div>Сдал (Ответственный клиники)</div></div>
			<div class="sig-col"><div class="sig-line"></div><div>Принял курьер лаборатории</div></div>
			<div class="sig-col"><div class="sig-line"></div><div>Принял зубной техник ЗТЛ</div></div>
		</div>
	</body></html>`;
}

export function LabOrdersTable(props: LabOrdersTableProps): React.JSX.Element {
	const { orders, onBatchStatusChange, initialSelectedIds, ...rowProps } = props;
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialSelectedIds ?? []));
	const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

	const validOrderIds = useMemo(() => {
		return orders.map((o) => o.id).filter((id): id is string => Boolean(id));
	}, [orders]);

	const isAllSelected = validOrderIds.length > 0 && validOrderIds.every((id) => selectedIds.has(id));
	const isSomeSelected = validOrderIds.some((id) => selectedIds.has(id));

	const handleToggleSelectAll = useCallback(() => {
		setSelectedIds((prev) => {
			if (validOrderIds.every((id) => prev.has(id))) {
				return new Set();
			}
			return new Set(validOrderIds);
		});
	}, [validOrderIds]);

	const handleToggleSelect = useCallback((orderId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(orderId)) {
				next.delete(orderId);
			} else {
				next.add(orderId);
			}
			return next;
		});
	}, []);

	const handleBatchCourierHandover = useCallback(async () => {
		if (selectedIds.size === 0 || !onBatchStatusChange || isSubmittingBatch) return;
		setIsSubmittingBatch(true);
		try {
			await onBatchStatusChange([...selectedIds], "sent");
			setSelectedIds(new Set());
		} finally {
			setIsSubmittingBatch(false);
		}
	}, [selectedIds, onBatchStatusChange, isSubmittingBatch]);

	const handlePrintRegistry = useCallback(() => {
		const selectedOrders = orders.filter((o) => o.id && selectedIds.has(o.id));
		if (selectedOrders.length === 0) return;
		const html = generateBatchRegistryPrintHtml(selectedOrders);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	}, [orders, selectedIds]);

	return (
		<div className="relative w-full">
			<div
				className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
				data-testid="lab-orders-table-container"
			>
				<table
					className="w-full min-w-[970px] text-left border-collapse table-fixed"
					data-testid="lab-orders-dense-table"
				>
					<LabOrdersTableHeader
						isAllSelected={isAllSelected}
						isSomeSelected={isSomeSelected}
						onToggleSelectAll={handleToggleSelectAll}
					/>
					<tbody className="divide-y divide-[var(--line)]">
						{orders.map((order) => (
							<LabOrdersTableRow
								key={order.id}
								order={order}
								isSelected={order.id ? selectedIds.has(order.id) : false}
								onToggleSelect={handleToggleSelect}
								{...rowProps}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* Floating Batch Action Bar for Macro-workflow (1-Click Courier Handover) */}
			{selectedIds.size > 0 ? (
				<div
					className="sticky bottom-3 z-30 mt-3 mx-auto max-w-2xl px-4 py-2.5 rounded-2xl bg-[var(--paper-strong)] text-[var(--ink)] shadow-xl border border-[var(--line-strong)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
					data-testid="lab-orders-batch-action-bar"
				>
					<div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
						<CheckSquare className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>Выбрано нарядов: <strong className="text-[var(--primary)] font-mono text-sm">{selectedIds.size}</strong></span>
					</div>

					<div className="flex items-center gap-2">
						{onBatchStatusChange ? (
							<button
								type="button"
								onClick={handleBatchCourierHandover}
								data-testid="batch-courier-handover-btn"
								className="min-h-[36px] h-9 px-3.5 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
							>
								{isSubmittingBatch ? (
									<Loader2 className="w-4 h-4 animate-spin shrink-0" />
								) : (
									<Truck className="w-4 h-4 shrink-0" />
								)}
								<span>Сдать курьеру ({selectedIds.size})</span>
							</button>
						) : null}

						<button
							type="button"
							onClick={handlePrintRegistry}
							data-testid="batch-print-registry-btn"
							className="min-h-[36px] h-9 px-3 py-1.5 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs flex items-center gap-1.5 cursor-pointer border border-[var(--line)] active:scale-95 transition-all"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать реестра</span>
						</button>

						<button
							type="button"
							onClick={() => setSelectedIds(new Set())}
							title="Снять выбор"
							aria-label="Снять выбор"
							className="h-9 w-9 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
						>
							<X className="w-4 h-4 shrink-0" />
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
