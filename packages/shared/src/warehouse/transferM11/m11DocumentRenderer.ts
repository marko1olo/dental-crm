/**
 * m11DocumentRenderer.ts — Statutory HTML/A4 Document Renderer for Form № M-11.
 *
 * STATUTORY REFERENCE:
 * - Унифицированная форма № М-11 «Требование-накладная» (код по ОКУД 0315003 / 0315006).
 * - Утверждена Постановлением Госкомстата РФ от 30.10.1997 № 71а.
 *
 * DESIGN INVARIANTS:
 * - Чистый A4 portrait печатный CSS-макет для старшей медсестры и завхоза.
 * - Полное отсутствие мультяшных эмодзи (Мандат 8d: святость бланков).
 * - Экранирование всех пользовательских строк против XSS-инъекций.
 * - Вывод сумм прописью по официальному российскому бухгалтерскому стандарту.
 */

import { kopecksToRub } from "../../fiscal/kopecksArithmetic.js";
import { escapeTemplateMacroHtml as escapeHtml } from "../../communications/messageTemplates.js";
import type { TransferM11Document } from "./types.js";
import { numberToWordsRuKopecks } from "./m11Calculators.js";

/**
 * Renders Form M-11 printable HTML document strictly compliant with Russian standard (ОКУД 0315003 / 0315006).
 */
export function renderTransferM11Html(doc: TransferM11Document): string {
	const totalDispatchedRub = kopecksToRub(doc.totalCostDispatchedKopecks).toFixed(2);
	const totalWords = numberToWordsRuKopecks(doc.totalCostDispatchedKopecks);

	const itemRows = doc.items
		.map((item) => {
			const unitCostRub = kopecksToRub(item.unitCostKopecks).toFixed(2);
			const totalCostDispatchedRub = kopecksToRub(item.totalCostDispatchedKopecks).toFixed(2);
			const lotInfo = [
				item.lotNumber ? `Сер: ${escapeHtml(item.lotNumber)}` : "",
				item.expirationDate ? `Срок: ${escapeHtml(item.expirationDate)}` : "",
				item.mdlpDataMatrix ? "Честный ЗНАК" : "",
			]
				.filter(Boolean)
				.join(" / ");

			return `
			<tr>
				<td class="center">${item.itemIndex}</td>
				<td>
					<strong>${escapeHtml(item.itemName)}</strong>
					${lotInfo ? `<br><small class="text-muted">${lotInfo}</small>` : ""}
				</td>
				<td class="center">${escapeHtml(item.nomenclatureCode ?? "—")}</td>
				<td class="center">${escapeHtml(item.unitName)} (${escapeHtml(item.unitOkeiCode)})</td>
				<td class="right">${item.quantityRequested}</td>
				<td class="right"><strong>${item.quantityDispatched}</strong></td>
				<td class="right">${unitCostRub} ₽</td>
				<td class="right"><strong>${totalCostDispatchedRub} ₽</strong></td>
			</tr>
		`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Требование-накладная № ${escapeHtml(doc.documentNumber)} (Форма М-11)</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 10mm;
		}
		body {
			font-family: "Liberation Sans", "Helvetica Neue", Arial, sans-serif;
			font-size: 12px;
			color: #1a1a1a;
			line-height: 1.4;
			margin: 20px;
		}
		.okud-header {
			display: flex;
			justify-content: flex-end;
			text-align: right;
			font-size: 11px;
			margin-bottom: 8px;
		}
		.okud-table {
			border-collapse: collapse;
			margin-left: auto;
			font-size: 11px;
		}
		.okud-table td, .okud-table th {
			border: 1px solid #333;
			padding: 2px 8px;
		}
		.doc-title {
			text-align: center;
			font-size: 16px;
			font-weight: bold;
			margin: 15px 0 10px 0;
			text-transform: uppercase;
		}
		.doc-meta-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 12px;
		}
		.doc-meta-table td, .doc-meta-table th {
			border: 1px solid #444;
			padding: 4px 6px;
			font-size: 11px;
		}
		.items-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 16px;
		}
		.items-table th, .items-table td {
			border: 1px solid #333;
			padding: 5px 6px;
		}
		.items-table th {
			background-color: #f0f0f0;
			font-weight: bold;
			text-align: center;
			font-size: 11px;
		}
		.center { text-align: center; }
		.right { text-align: right; }
		.text-muted { color: #666; }
		.totals-block {
			margin-top: 10px;
			margin-bottom: 20px;
			font-size: 12px;
		}
		.signatures-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 30px;
			margin-top: 30px;
			font-size: 11px;
		}
		.signature-line {
			border-bottom: 1px solid #333;
			margin-top: 25px;
			display: flex;
			justify-content: space-between;
			padding-bottom: 2px;
		}
		.stamp-place {
			font-size: 10px;
			color: #777;
			text-align: center;
			margin-top: 4px;
		}
		@media print {
			body { margin: 0; }
			.items-table th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
		}
	</style>
</head>
<body>
	<div class="okud-header">
		<div>
			Типовая межотраслевая форма № М-11<br>
			Утверждена Постановлением Госкомстата России от 30.10.97 № 71а
			<table class="okud-table" style="margin-top: 4px;">
				<tr>
					<th>Форма по ОКУД</th>
					<td><strong>0315003 / 0315006</strong></td>
				</tr>
			</table>
		</div>
	</div>

	<div class="doc-title">
		ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${escapeHtml(doc.documentNumber)} от ${escapeHtml(doc.documentDate)}
	</div>

	<table class="doc-meta-table">
		<tr>
			<th rowspan="2">Организация</th>
			<th colspan="2">Структурное подразделение</th>
			<th rowspan="2">Вид деятельности / Операция</th>
			<th colspan="2">Корреспондирующий счет</th>
		</tr>
		<tr>
			<th>Сдатчик (Отправитель)</th>
			<th>Приемщик (Получатель)</th>
			<th>Дебет</th>
			<th>Кредит</th>
		</tr>
		<tr>
			<td>DENTE Стоматологическая сеть</td>
			<td><strong>${escapeHtml(doc.fromBranchName)}</strong> (${escapeHtml(doc.fromWarehouseName)})</td>
			<td><strong>${escapeHtml(doc.toBranchName)}</strong> (${escapeHtml(doc.toWarehouseName)})</td>
			<td class="center">${escapeHtml(doc.operationType)}</td>
			<td class="center"><strong>${escapeHtml(doc.debitAccount)}</strong></td>
			<td class="center"><strong>${escapeHtml(doc.creditAccount)}</strong></td>
		</tr>
	</table>

	<table class="items-table">
		<thead>
			<tr>
				<th rowspan="2" style="width: 30px;">№</th>
				<th rowspan="2">Материал (наименование, сорт, размер, марка)</th>
				<th rowspan="2" style="width: 90px;">Номенклатурный номер</th>
				<th rowspan="2" style="width: 70px;">Ед. изм. (ОКЕИ)</th>
				<th colspan="2">Количество</th>
				<th rowspan="2" style="width: 80px;">Учетная цена</th>
				<th rowspan="2" style="width: 90px;">Сумма</th>
			</tr>
			<tr>
				<th style="width: 70px;">Затребовано</th>
				<th style="width: 70px;">Отпущено</th>
			</tr>
		</thead>
		<tbody>
			${itemRows}
			<tr style="background-color: #fcfcfc; font-weight: bold;">
				<td colspan="4" class="right">ИТОГО:</td>
				<td class="right">${doc.totalQuantityRequested}</td>
				<td class="right">${doc.totalQuantityDispatched}</td>
				<td class="right">—</td>
				<td class="right">${totalDispatchedRub} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="totals-block">
		<p><strong>Всего отпущено наименований:</strong> ${doc.totalItemsCount}, на сумму <strong>${totalDispatchedRub} ₽</strong></p>
		<p><strong>Сумма прописью:</strong> <em>${escapeHtml(totalWords)}</em></p>
		${doc.notes ? `<p><strong>Примечание:</strong> ${escapeHtml(doc.notes)}</p>` : ""}
	</div>

	<div class="signatures-grid">
		<div>
			<div><strong>Отпустил (Сдатчик):</strong></div>
			<div>Должность: ${escapeHtml(doc.dispatchedBy?.position ?? "Заведующий складом")}</div>
			<div class="signature-line">
				<span>Подпись: _________________</span>
				<span>/ ${escapeHtml(doc.dispatchedBy?.name ?? "_________________")} /</span>
			</div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div>
			<div><strong>Принял (Получатель):</strong></div>
			<div>Должность: ${escapeHtml(doc.acceptedBy?.position ?? "Материально ответственное лицо")}</div>
			<div class="signature-line">
				<span>Подпись: _________________</span>
				<span>/ ${escapeHtml(doc.acceptedBy?.name ?? "_________________")} /</span>
			</div>
			<div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}
