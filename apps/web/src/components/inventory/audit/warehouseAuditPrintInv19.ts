import type { WarehouseInventoryAuditDocument } from "./warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";
import { calculateInventoryAuditTotals } from "./warehouseAuditTotalsCalculator.js";
import { numberToRussianWordsKopecks } from "./warehouseAuditMath.js";

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

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-19: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-19<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317019</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>МОЛ:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
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

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого излишек прописью:</b> ${numberToRussianWordsKopecks(totals.totalSurplusCostKopecks)}<br>
    <b>Итого недостача прописью:</b> ${numberToRussianWordsKopecks(totals.totalShortageCostKopecks)}<br>
    <b>Итоговое сальдо сверки:</b> ${totals.netDiscrepancyCostRubles >= 0 ? "+" : ""}${totals.netDiscrepancyCostRubles.toFixed(2)} руб.
  </div>

  <div style="margin-top: 16px;">
    <h4>Подписи членов комиссии и МОЛ:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      С результатами сличения согласен:<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}
