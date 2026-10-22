import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsTypes.js";

/**
 * Формирует чистую печатную товарную накладную ТОРГ-12 в HTML.
 */
export function generateTorg12Html(
	waybill: AcceptanceWaybillDocument,
	clinicInfo?: { readonly nameRu?: string | undefined; readonly inn?: string | undefined },
): string {
	const clinicName = clinicInfo?.nameRu || "Стоматологическая клиника DENTE";
	const clinicInn = clinicInfo?.inn || "7701987654";

	const rows = waybill.items.map((item, idx) => {
		const subtotalRub = (item.lineSubtotalKopecks / 100).toFixed(2);
		const vatRub = (item.vatKopecks / 100).toFixed(2);
		const totalRub = (item.lineTotalKopecks / 100).toFixed(2);
		const unitPriceRub = (item.unitPriceKopecks / 100).toFixed(2);

		return `
		<tr>
			<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${idx + 1}</td>
			<td style="padding:4px 6px; border:1px solid #000;">
				<strong>${item.name}</strong><br>
				<span style="font-size:10px; color:#444;">Серия/партия: ${item.batchNumber} | Срок: ${item.expirationDate} | ${item.category}</span>
			</td>
			<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${item.unit}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${item.quantity}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${unitPriceRub}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${subtotalRub}</td>
			<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${item.vatRate === 0 ? "Без НДС" : `${item.vatRate}%`}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${vatRub}</td>
			<td style="text-align:right; padding:4px 6px; border:1px solid #000; font-weight:bold;">${totalRub}</td>
		</tr>`;
	}).join("");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Товарная накладная № ${waybill.waybillNumber}</title>
<style>
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; margin: 20px; line-height: 1.25; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
th { background: #f0f0f0; border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; }
.header-table td { padding: 3px 0; border: none; font-size: 10pt; }
.signatures { margin-top: 30px; width: 100%; font-size: 10pt; }
.signatures td { padding: 10px 0; border: none; }
@media print { body { margin: 10mm; } }
</style></head><body>
<div style="text-align:right; font-size:9pt; margin-bottom:10px; color:#666;">
Товарная накладная (Унифицированная форма № ТОРГ-12, утв. Госкомстата России) • Приходная накладная материалов
</div>
<table class="header-table">
<tr><td style="width:15%;"><strong>Грузоотправитель:</strong></td><td>${waybill.supplier.name}, ИНН ${waybill.supplier.inn || "—"}</td></tr>
<tr><td><strong>Поставщик:</strong></td><td>${waybill.supplier.name}, ИНН ${waybill.supplier.inn || "—"}</td></tr>
<tr><td><strong>Плательщик:</strong></td><td>${clinicName}, ИНН ${clinicInn}</td></tr>
<tr><td><strong>Грузополучатель:</strong></td><td>${clinicName}, Склад: ${waybill.warehouseName}</td></tr>
</table>
<div style="margin: 15px 0 10px 0; text-align: center;">
<h2 style="margin: 0; font-size: 14pt;">ТОВАРНАЯ НАКЛАДНАЯ № ${waybill.waybillNumber}</h2>
<div style="font-size: 11pt; font-weight: bold;">от ${waybill.receiptDate} г.</div>
</div>
<table><thead><tr>
<th style="width:4%;">№</th><th style="width:38%;">Товар (наименование, серия, срок годности)</th><th style="width:6%;">Ед.</th>
<th style="width:7%;">Кол-во</th><th style="width:11%;">Цена, руб.</th><th style="width:11%;">Сумма без НДС</th>
<th style="width:7%;">НДС</th><th style="width:8%;">Сумма НДС</th><th style="width:12%;">Сумма с НДС, руб.</th>
</tr></thead><tbody>${rows}
<tr style="font-weight:bold; background:#fafafa;">
<td colspan="3" style="text-align:right; padding:6px; border:1px solid #000;">ИТОГО:</td>
<td style="text-align:right; padding:6px; border:1px solid #000;">${waybill.totals.totalQuantity}</td>
<td style="border:1px solid #000;"></td><td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.subtotalKopecks / 100).toFixed(2)}</td>
<td style="border:1px solid #000;"></td><td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.totalVatKopecks / 100).toFixed(2)}</td>
<td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.totalCostKopecks / 100).toFixed(2)}</td>
</tr></tbody></table>
<table class="signatures"><tr>
<td style="width:50%;"><strong>Отпустил (Поставщик):</strong><br><br>_________________ / _________________ /<br><span style="font-size:8pt; color:#666;">подпись, расшифровка</span></td>
<td style="width:50%;"><strong>Принял (Получатель):</strong><br><br>${waybill.receiverPosition} ______________ / ${waybill.receiverFullName} /<br><span style="font-size:8pt; color:#666;">подпись, расшифровка (Ответственный сотрудник)</span></td>
</tr></table></body></html>`;
}
