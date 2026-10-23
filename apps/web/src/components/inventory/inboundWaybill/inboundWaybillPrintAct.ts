import { showToast } from "../../GlobalToast.js";
import type { InboundWaybillLine, WaybillTotals } from "./inboundWaybillTypes.js";

export function printWaybillAct(params: {
	waybillNumber: string;
	receiptDate: string;
	warehouseName: string;
	supplierName: string;
	lines: InboundWaybillLine[];
	totals: WaybillTotals;
}) {
	const { waybillNumber, receiptDate, warehouseName, supplierName, lines, totals } = params;

	const rows = lines
		.map(
			(l, idx) => `
		<tr>
			<td style="text-align:center; padding:4px 6px; border:1px solid #ccc;">${idx + 1}</td>
			<td style="padding:4px 6px; border:1px solid #ccc;"><strong>${l.name}</strong><br><span style="font-size:10px; color:#555;">Партия: ${l.lotNumber} | Годен до: ${l.expirationDate}</span></td>
			<td style="text-align:center; padding:4px 6px; border:1px solid #ccc;">${l.unit}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #ccc; font-weight:bold;">${l.quantity}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #ccc;">${l.unitCostRub.toLocaleString("ru-RU")} ₽</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #ccc; font-weight:bold;">${(l.quantity * l.unitCostRub).toLocaleString("ru-RU")} ₽</td>
		</tr>
	`,
		)
		.join("");

	const html = `<!DOCTYPE html>
	<html lang="ru"><head><meta charset="utf-8"><title>Приходная накладная № ${waybillNumber}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111; margin: 24px; line-height: 1.3; }
		table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10pt; }
		th { background: #f3f4f6; border: 1px solid #ccc; padding: 6px; font-weight: 600; text-align: center; }
		.signatures { margin-top: 36px; width: 100%; font-size: 10pt; }
		.signatures td { padding: 8px 0; border: none; }
		@media print { body { margin: 12mm; } }
	</style></head><body>
	<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #14b8a6; padding-bottom:10px;">
		<div>
			<h2 style="margin:0; font-size:16pt; color:#0f172a;">ПРИХОДНАЯ НАКЛАДНАЯ МАТЕРИАЛОВ № ${waybillNumber}</h2>
			<div style="font-size:11pt; color:#475569; margin-top:4px;">Дата приёмки: ${receiptDate} г. • Склад: ${warehouseName}</div>
		</div>
		<div style="text-align:right; font-size:10pt; color:#64748b;">
			Поставщик: <strong>${supplierName}</strong>
		</div>
	</div>
	<table><thead><tr>
		<th style="width:5%;">№</th>
		<th style="width:45%; text-align:left;">Наименование материала, партия, срок</th>
		<th style="width:8%;">Ед.</th>
		<th style="width:10%;">Кол-во</th>
		<th style="width:14%;">Цена за ед.</th>
		<th style="width:18%;">Сумма</th>
	</tr></thead><tbody>${rows}
	<tr style="background:#f8fafc; font-weight:bold;">
		<td colspan="3" style="text-align:right; padding:8px; border:1px solid #ccc;">ИТОГО:</td>
		<td style="text-align:right; padding:8px; border:1px solid #ccc;">${totals.totalQty}</td>
		<td style="border:1px solid #ccc;"></td>
		<td style="text-align:right; padding:8px; border:1px solid #ccc; color:#0f766e;">${totals.totalSumFormatted}</td>
	</tr></tbody></table>
	<table class="signatures"><tr>
		<td style="width:50%;"><strong>Отпустил (Поставщик):</strong><br><br>_________________ / _________________ /</td>
		<td style="width:50%;"><strong>Принял (Ответственный сотрудник):</strong><br><br>_________________ / _________________ /</td>
	</tr></table></body></html>`;

	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		setTimeout(() => win.print(), 250);
	}
}

export function exportWaybillCsv(waybillNumber: string, lines: InboundWaybillLine[]) {
	const header = "№;Наименование;Партия;Срок годности;Количество;Ед;Цена руб;Сумма руб\n";
	const rows = lines
		.map(
			(l, idx) =>
				`${idx + 1};"${l.name.replace(/"/g, '""')}";"${l.lotNumber}";"${l.expirationDate}";${l.quantity};"${l.unit}";${l.unitCostRub};${l.quantity * l.unitCostRub}`,
		)
		.join("\n");
	const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Накладная_${waybillNumber}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	showToast("CSV файл выгружен", "info");
}
