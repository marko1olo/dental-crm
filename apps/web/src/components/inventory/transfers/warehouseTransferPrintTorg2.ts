import type { WarehouseDiscrepancyAct } from "./warehouseTransferTypes.js";

export function generateTorg2Html(act: WarehouseDiscrepancyAct): string {
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
	<title>Акт об установленном расхождении № ${act.actNumber}</title>
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
	<div class="title">АКТ ОБ УСТАНОВЛЕННОМ РАСХОЖДЕНИИ ПО КОЛИЧЕСТВУ И КАЧЕСТВУ ТМЦ № ${act.actNumber}</div>
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
