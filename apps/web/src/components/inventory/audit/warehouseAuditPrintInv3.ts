import type { WarehouseInventoryAuditDocument } from "./warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";
import { calculateInventoryAuditTotals } from "./warehouseAuditTotalsCalculator.js";
import { numberToRussianWordsKopecks } from "./warehouseAuditMath.js";

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

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position} (${c.role === "chairman" ? "Председатель" : "Член комиссии"}):</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-3: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .receipt-box { border: 1px solid #000; padding: 8px; font-size: 9.5pt; margin-bottom: 12px; }
    .footer-box { margin-top: 16px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-3<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317004</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад / Подразделение:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>Материально ответственное лицо:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
      <b>Номер описи:</b> ${doc.documentNumber}<br>
      <b>Дата составления:</b> ${doc.auditDate}<br>
      <b>Основание:</b> Приказ № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ</h2>
  <h3>товарно-материальных ценностей № ${doc.documentNumber}</h3>

  <div class="receipt-box">
    <b>Расписка:</b> К началу проведения инвентаризации все расходные и приходные документы на товарно-материальные ценности сданы в бухгалтерию, и все ценности, поступившие на мою ответственность, оприходованы, а выбывшие списаны в расход.<br>
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

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого фактическая сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalActualCostKopecks)}<br>
    <b>Итого учетная сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalBookCostKopecks)}
  </div>

  <div class="footer-box">
    <h4>Члены инвентаризационной комиссии:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      Все ценности, поименованные в настоящей описи с № 1 по № ${doc.items.length}, комиссией проверены в натуре в моем присутствии и внесены в опись.<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}
