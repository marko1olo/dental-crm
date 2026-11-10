import type { WarehouseInventoryAuditDocument } from "./audit/warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";
import { calculateInventoryAuditTotals } from "./audit/warehouseAuditTotalsCalculator.js";
import { numberToRussianWordsKopecks } from "./audit/warehouseAuditMath.js";

export {
	exportInventoryToCsv,
	exportInv19DiscrepanciesToCsv,
} from "./audit/warehouseAuditCsvExport.js";

export { exportInventoryTo1C } from "./audit/warehouseAudit1CExport.js";
export { generateTorg16Html } from "./audit/warehouseAuditPrintTorg16.js";

/**
 * generateInv3Html — Инвентаризационная опись материалов клиники (ИНВ-3).
 * Мандаты 8e (Врачебная автономия), 8n (Соло-клиника), 8x (Чистый клинический язык).
 */
export function generateInv3Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const rows = doc.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: center;">${it.okeiCode}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.actualQuantity}</td>
      <td style="text-align: right; font-weight: bold;">${kopecksToRubles(it.actualTotalKopecks).toFixed(2)}</td>
      <td style="text-align: right;">${it.bookQuantity}</td>
      <td style="text-align: right;">${kopecksToRubles(it.bookTotalKopecks).toFixed(2)}</td>
    </tr>`).join("");

	const signs = doc.commission.length > 0
		? doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position} (${c.role === "chairman" ? "Председатель" : "Член комиссии"}):</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("")
		: `<div>Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-3: ${doc.documentNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10pt; line-height: 1.25; color: #0f172a; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 9.5pt; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
    th { background: #f8fafc; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #0f766e; padding-bottom: 8px; }
    .receipt-box { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; margin-bottom: 12px; background: #f8fafc; }
    .footer-box { margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 8.5pt; color: #64748b;">
    Форма № ИНВ-3 (ОКУД 0317004)<br>
    Стоматологическая клиника DENTE
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад / Подразделение:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>Материально ответственное лицо:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div style="text-align: right;">
      <b>Номер описи:</b> ${doc.documentNumber}<br>
      <b>Дата составления:</b> ${doc.auditDate}<br>
      <b>Основание:</b> Приказ № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ</h2>
  <h3>товарно-материальных ценностей № ${doc.documentNumber}</h3>

  <div class="receipt-box">
    <b>Расписка:</b> К началу проведения инвентаризации все расходные и приходные документы на товарно-материальные ценности сданы, и все ценности, поступившие на мою ответственность, оприходованы, а выбывшие списаны.<br>
    Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th><th rowspan="2">Наименование ТМЦ</th><th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th><th rowspan="2">Срок годности</th><th colspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th><th colspan="2">Фактическое наличие</th><th colspan="2">По данным учета</th>
      </tr>
      <tr>
        <th>наим.</th><th>ОКЕИ</th><th>Кол-во</th><th>Сумма (руб.)</th><th>Кол-во</th><th>Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="8" style="text-align: right;">ИТОГО ПО ОПИСИ:</td>
        <td style="text-align: right;">${totals.totalActualQuantity}</td>
        <td style="text-align: right;">${totals.totalActualCostRubles.toFixed(2)}</td>
        <td style="text-align: right;">${totals.totalBookQuantity}</td>
        <td style="text-align: right;">${totals.totalBookCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10pt;">
    <b>Итого фактическая сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalActualCostKopecks)}<br>
    <b>Итого учетная сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalBookCostKopecks)}
  </div>

  <div class="footer-box">
    <h4>Ответственные лица:</h4>
    ${signs}
  </div>
</body>
</html>`;
}

/**
 * generateInv19Html — Сличительная ведомость результатов инвентаризации ТМЦ (ИНВ-19).
 */
export function generateInv19Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusQty : "-"}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusSum : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageQty : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageSum : "-"}</td>
    </tr>`;
	}).join("");

	const signs = doc.commission.length > 0
		? doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("")
		: `<div>Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-19: ${doc.documentNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10pt; line-height: 1.25; color: #0f172a; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 9.5pt; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
    th { background: #f8fafc; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #0f766e; padding-bottom: 8px; }
    .footer-box { margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 8.5pt; color: #64748b;">
    Форма № ИНВ-19 (ОКУД 0317019)<br>
    Стоматологическая клиника DENTE
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>МОЛ:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div style="text-align: right;">
      <b>Ведомость к описи №:</b> ${doc.documentNumber}<br>
      <b>Дата сверки:</b> ${doc.auditDate}<br>
      <b>Приказ:</b> № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ</h2>
  <h3>результатов инвентаризации ТМЦ № ${doc.documentNumber}</h3>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th><th rowspan="2">Наименование ТМЦ</th><th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th><th rowspan="2">Срок годности</th><th rowspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th><th colspan="2" style="background: #d1fae5;">Излишки</th>
        <th colspan="2" style="background: #fee2e2;">Недостачи</th>
      </tr>
      <tr>
        <th style="background: #d1fae5;">Кол-во</th><th style="background: #d1fae5;">Сумма (руб.)</th>
        <th style="background: #fee2e2;">Кол-во</th><th style="background: #fee2e2;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="11" style="text-align: center; padding: 12px;">Расхождений не выявлено (книжные остатки совпадают с фактическими на 100%).</td></tr>'}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="7" style="text-align: right;">ИТОГО РАСХОЖДЕНИЙ:</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusQuantity}</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusCostRubles.toFixed(2)}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageQuantity}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10pt;">
    <b>Итого излишек прописью:</b> ${numberToRussianWordsKopecks(totals.totalSurplusCostKopecks)}<br>
    <b>Итого недостача прописью:</b> ${numberToRussianWordsKopecks(totals.totalShortageCostKopecks)}<br>
    <b>Итоговое сальдо сверки:</b> ${totals.netDiscrepancyCostRubles >= 0 ? "+" : ""}${totals.netDiscrepancyCostRubles.toFixed(2)} руб.
  </div>

  <div class="footer-box">
    <h4>Подписи:</h4>
    ${signs}
  </div>
</body>
</html>`;
}
