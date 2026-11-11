import type { WarehouseInventoryAuditDocument, WarehouseTorg16WriteoffAct } from "./audit/warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";
import { calculateInventoryAuditTotals } from "./audit/warehouseAuditTotalsCalculator.js";
import { numberToRussianWordsKopecks } from "./audit/warehouseAuditMath.js";

export {
	exportInventoryToCsv,
	exportInv19DiscrepanciesToCsv,
} from "./audit/warehouseAuditCsvExport.js";

export { exportInventoryTo1C } from "./audit/warehouseAudit1CExport.js";

/**
 * generateWarehouseWriteoffActHtml — Канонический акт списания материалов по результатам инвентаризации.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-клиника), 8x (Без советских бланков ТОРГ-16 и ОКУД 0330216).
 */
export function generateWarehouseWriteoffActHtml(act: WarehouseTorg16WriteoffAct): string {
	const words = numberToRussianWordsKopecks(act.totalCostKopecks);
	const rows = act.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td><strong>${it.nameRu}</strong></td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${(it.unitCostKopecks / 100).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.quantity}</td>
      <td style="text-align: right; font-weight: bold;">${it.totalCostRubles.toFixed(2)}</td>
      <td>${it.defectDescriptionRu || act.reasonRu || "Истек срок годности"}</td>
    </tr>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Акт списания материалов: ${act.actNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #0f172a; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 9.5pt; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; }
    th { background: #f8fafc; text-align: center; font-weight: 600; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #0f766e; padding-bottom: 8px; }
    .footer-box { margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 8.5pt; color: #64748b;">
    Акт списания материалов клиники<br>
    Стоматологическая клиника DENTE
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${act.organizationNameRu}<br>
      <b>Склад / Подразделение:</b> ${act.warehouseNameRu}<br>
      <b>Ответственное лицо:</b> ${act.molPosition} ${act.molFullName}
    </div>
    <div style="text-align: right; font-size: 9pt; color: #475569;">
      <b>Акт №:</b> ${act.actNumber}<br>
      <b>Дата:</b> ${act.actDate}<br>
      <b>Основание:</b> Опись ${act.inventoryDocNumber}
    </div>
  </div>

  <h2>АКТ СПИСАНИЯ МАТЕРИАЛОВ КЛИНИКИ № ${act.actNumber}</h2>
  <div style="text-align: center; color: #475569; margin-bottom: 12px;">Причина списания: <b>${act.reasonRu}</b></div>

  <table>
    <thead>
      <tr>
        <th>№</th><th>Наименование материала</th><th>Артикул</th><th>Партия</th>
        <th>Срок годности</th><th>Ед.</th><th>Цена (руб.)</th><th>Кол-во</th>
        <th>Сумма (руб.)</th><th>Причина / дефект</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #f8fafc;">
        <td colspan="7" style="text-align: right;">ВСЕГО ПО АКТУ:</td>
        <td style="text-align: right;">${act.totalQuantity}</td>
        <td style="text-align: right; color: #0f766e;">${act.totalCostRubles.toFixed(2)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10pt;">
    <b>Итого сумма списания прописью:</b> ${words}
  </div>

  <div class="footer-box">
    <div style="display: flex; justify-content: space-between;">
      <div>
        <b>Списание произвел:</b> ${act.molPosition}<br>
        ________________ / ${act.molFullName} /<br>
        «____» ________________ 2026 г.
      </div>
      <div>
        <b>Утверждаю (Руководитель клиники):</b><br>
        ________________ / ________________________ /
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const generateTorg16Html = generateWarehouseWriteoffActHtml;

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

	const signs = `<div>Материально ответственное лицо (МОЛ): ____________________ / <b>${doc.molFullName}</b> (${doc.molPosition}) /</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Инвентаризационная ведомость остатков: ${doc.documentNumber}</title>
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
    Инвентаризационная ведомость остатков материалов<br>
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

	const signs = `<div>Материально ответственное лицо (МОЛ): ____________________ / <b>${doc.molFullName}</b> (${doc.molPosition}) /</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Сличительная ведомость инвентаризации: ${doc.documentNumber}</title>
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
    Сличительная ведомость инвентаризации материалов<br>
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
