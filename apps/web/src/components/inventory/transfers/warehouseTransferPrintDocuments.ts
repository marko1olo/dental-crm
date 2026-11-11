import { kopecksToRubles } from "@dental/shared";
import { getWarehouseBranch } from "./warehouseTransferPresets.js";
import type { WarehouseDiscrepancyAct, WarehouseTransferDocument } from "./warehouseTransferTypes.js";
import { calculateTransferTotals } from "./warehouseTransferTotalsCalculator.js";

/**
 * generateMaterialTransferHtml — Печатная форма накладной на внутреннее перемещение материалов.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-клиника), 8x (Без советских бланков ТОРГ-13 и ОКУД 0330213).
 */
export function generateMaterialTransferHtml(doc: WarehouseTransferDocument): string {
	const source = getWarehouseBranch(doc.sourceBranchId);
	const target = getWarehouseBranch(doc.targetBranchId);
	const totals = calculateTransferTotals(doc.items);

	const rowsHtml = doc.items
		.map((item, index) => {
			const unitCostRub = kopecksToRubles(item.unitCostKopecks);
			const totalCostRub = (item.dispatchedQuantity * item.unitCostKopecks) / 100;

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${item.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${item.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.batchNumber}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.expiryDate || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.unitRu} (${item.okeiCode})</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${item.dispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitCostRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalCostRub.toFixed(2)}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Накладная перемещения материалов № ${doc.documentNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header-box { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.okud { text-align: right; font-size: 8pt; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 6px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; }
		.sign-box { width: 45%; }
	</style>
</head>
<body>
	<div class="header-box">
		<div>
			<strong>Организация:</strong> ООО «Стоматологическая клиника ДЕНТЕ»<br>
			<strong>Структурное подразделение (Отправитель):</strong> ${source.nameRu} (Код: ${source.code})<br>
			<strong>Структурное подразделение (Получатель):</strong> ${target.nameRu} (Код: ${target.code})
		</div>
		<div class="okud">
			Накладная перемещения материалов<br>
			Стоматологическая клиника DENTE
		</div>
	</div>

	<div class="title">НАКЛАДНАЯ НА ВНУТРЕННЕЕ ПЕРЕМЕЩЕНИЕ МАТЕРИАЛОВ № ${doc.documentNumber}</div>
	<div style="text-align: center; margin-bottom: 10px;">Дата составления: <strong>${doc.documentDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th rowspan="2">№</th>
				<th rowspan="2">Наименование товара, материала</th>
				<th rowspan="2">Артикул (SKU)</th>
				<th rowspan="2">Серия (LOT)</th>
				<th rowspan="2">Срок годности</th>
				<th rowspan="2">Ед. изм.</th>
				<th colspan="3">Отпущено</th>
			</tr>
			<tr>
				<th>Количество</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО ПО НАКЛАДНОЙ:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalDispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalDispatchedCostRubles.toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<p>Всего отпущено <strong>${doc.items.length}</strong> наименований на общую сумму <strong>${totals.totalDispatchedCostRubles.toFixed(2)} руб.</strong></p>

	<div class="signatures">
		<div class="sign-box">
			<strong>ОТПУСТИЛ (Склад-отправитель):</strong><br>
			${doc.dispatchedByPosition}<br>
			________________ / ${doc.dispatchedByFullName} /<br>
			Дата: ${doc.dispatchedDate || doc.documentDate} г.
		</div>
		<div class="sign-box">
			<strong>ПРИНЯЛ (Склад-получатель):</strong><br>
			${doc.receivedByPosition}<br>
			________________ / ${doc.receivedByFullName} /<br>
			Дата: ${doc.receivedDate || doc.documentDate} г.
		</div>
	</div>
</body>
</html>`;
}

export const generateTorg13Html = generateMaterialTransferHtml;

/**
 * generateTransferDiscrepancyActHtml — Акт расхождения при приёмке материалов.
 * Мандаты 8e (Врачебная автономия), 8n (Соло-клиника), 8x (Без советских бланков ТОРГ-2 и ОКУД 0330202).
 */
export function generateTransferDiscrepancyActHtml(act: WarehouseDiscrepancyAct): string {
	const rowsHtml = act.discrepancyItems
		.map((item, index) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${item.item.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${item.item.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.item.batchNumber}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${item.item.dispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${item.item.receivedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c; font-weight: bold;">${item.shortageQty || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c; font-weight: bold;">${item.damagedQty || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${item.financialDamageRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${item.causeRu}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт расхождения при приемке материалов № ${act.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 6px; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="title">АКТ РАСХОЖДЕНИЯ ПРИ ПРИЕМКЕ МАТЕРИАЛОВ № ${act.actNumber}</div>
	<div style="text-align: center; margin-bottom: 10px;">
		к Накладной на внутреннее перемещение № <strong>${act.transferDocNumber}</strong> от <strong>${act.actDate} г.</strong>
	</div>

	<p>
		<strong>Отправитель:</strong> ${act.sourceBranch.nameRu}<br>
		<strong>Получатель:</strong> ${act.targetBranch.nameRu}<br>
		Ответственный сотрудник Получателя составил настоящий акт о том, что при приемке ТМЦ выявлены следующие расхождения:
	</p>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование товара</th>
				<th>Артикул</th>
				<th>Серия (LOT)</th>
				<th>По накладной</th>
				<th>Фактически принято</th>
				<th>Недостача</th>
				<th>Бой / Брак</th>
				<th>Сумма ущерба, руб.</th>
				<th>Причина / Характер расхождения</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="8" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО СУММА УЩЕРБА:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c;">${act.totalFinancialDamageRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	<p><strong>Заключение:</strong> Сумма выявленного ущерба составляет <strong>${act.totalFinancialDamageRubles.toFixed(2)} руб.</strong> Подлежит урегулированию между складом-отправителем и службой логистики.</p>

	<div class="signatures">
		${act.commissionMembers
			.map(
				(m) => `<div>
			<strong>${m.position}:</strong><br>
			________________ / ${m.name} /
		</div>`,
			)
			.join("\n")}
	</div>
</body>
</html>`;
}

export const generateTorg2Html = generateTransferDiscrepancyActHtml;
