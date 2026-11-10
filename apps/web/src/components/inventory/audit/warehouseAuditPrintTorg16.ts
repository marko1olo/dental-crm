import type { WarehouseTorg16WriteoffAct } from "./warehouseAuditTypes.js";
import { numberToRussianWordsKopecks } from "./warehouseAuditMath.js";

/**
 * generateTorg16Html — Канонический акт списания материалов по результатам инвентаризации.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-клиника), 8x (Без советских бланков ТОРГ-16 и ОКУД 0330216).
 */
export function generateTorg16Html(act: WarehouseTorg16WriteoffAct): string {
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
    Форма № ТОРГ-16 (ОКУД 0330216)<br>
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

  <h2>АКТ О СПИСАНИИ ТОВАРОВ № ${act.actNumber}</h2>
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
