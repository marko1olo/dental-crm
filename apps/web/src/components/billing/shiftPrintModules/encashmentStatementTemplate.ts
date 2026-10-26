/**
 * encashmentStatementTemplate.ts — Modern Encashment Statement HTML Template.
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy.
 */
import type { EncashmentStatementData } from "./types.js";

export function generateEncashmentStatementHtml(stmt: EncashmentStatementData): string {
	const d = stmt.denominations;
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Ведомость инкассации № ${stmt.statementNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.35; }
		.header { border-bottom: 2px solid #0f766e; padding-bottom: 5px; margin-bottom: 12px; }
		.org-name { font-size: 12pt; font-weight: 700; text-transform: uppercase; }
		.doc-title { text-align: center; font-size: 13pt; font-weight: 700; margin: 12px 0 4px 0; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 9.5pt; color: #64748b; margin-bottom: 12px; }
		.grid-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
		.grid-table th, .grid-table td { padding: 5px 8px; border: 1px solid #cbd5e1; }
		.grid-table th { background-color: #f1f5f9; text-align: center; font-weight: 600; }
		.sig-block { margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 9.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<div class="org-name">${stmt.clinic.legalName}</div>
		<div style="font-size: 8.5pt; color: #64748b;">ИНН: ${stmt.clinic.inn} • Адрес: ${stmt.clinic.address}</div>
	</div>
	<div class="doc-title">Ведомость инкассации и передачи выручки</div>
	<div class="doc-subtitle">№ <strong>${stmt.statementNumber}</strong> • Смена № <strong>${stmt.shiftNumber}</strong> от <strong>${stmt.dateRu} г.</strong></div>

	<table class="grid-table">
		<tr><td style="width: 35%;"><strong>Куда передается:</strong></td><td>${stmt.destinationLabel}</td></tr>
		<tr><td><strong>Сейф-пакет / Пломба:</strong></td><td>${stmt.bagNumber || "—"} / ${stmt.sealNumber || "—"}</td></tr>
		<tr><td><strong>Сумма цифрами:</strong></td><td style="font-size: 11pt; font-weight: 700;">${stmt.encashmentAmountRub.toFixed(2)} руб.</td></tr>
		<tr><td><strong>Сумма прописью:</strong></td><td style="font-weight: 600;">${stmt.encashmentAmountWordsRu}</td></tr>
	</table>

	<div style="margin-top: 12px; font-weight: 600; font-size: 10pt;">Покупюрная опись вложения:</div>
	<table class="grid-table" style="margin-top: 4px; font-size: 9pt;">
		<thead>
			<tr><th>Номинал</th><th>Кол-во</th><th>Сумма (руб.)</th><th>Номинал</th><th>Кол-во</th><th>Сумма (руб.)</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>5 000 ₽</td><td style="text-align: center;">${d.b5000 ?? 0}</td><td style="text-align: right;">${((d.b5000 ?? 0) * 5000).toFixed(2)}</td>
				<td>200 ₽</td><td style="text-align: center;">${d.b200 ?? 0}</td><td style="text-align: right;">${((d.b200 ?? 0) * 200).toFixed(2)}</td>
			</tr>
			<tr>
				<td>2 000 ₽</td><td style="text-align: center;">${d.b2000 ?? 0}</td><td style="text-align: right;">${((d.b2000 ?? 0) * 2000).toFixed(2)}</td>
				<td>100 ₽</td><td style="text-align: center;">${d.b100 ?? 0}</td><td style="text-align: right;">${((d.b100 ?? 0) * 100).toFixed(2)}</td>
			</tr>
			<tr>
				<td>1 000 ₽</td><td style="text-align: center;">${d.b1000 ?? 0}</td><td style="text-align: right;">${((d.b1000 ?? 0) * 1000).toFixed(2)}</td>
				<td>50 ₽</td><td style="text-align: center;">${d.b50 ?? 0}</td><td style="text-align: right;">${((d.b50 ?? 0) * 50).toFixed(2)}</td>
			</tr>
			<tr>
				<td>500 ₽</td><td style="text-align: center;">${d.b500 ?? 0}</td><td style="text-align: right;">${((d.b500 ?? 0) * 500).toFixed(2)}</td>
				<td>Монеты / Мелочь</td><td style="text-align: center;">—</td><td style="text-align: right;">${(((d.c10 ?? 0) * 10 + (d.c5 ?? 0) * 5 + (d.c2 ?? 0) * 2 + (d.c1 ?? 0) * 1 + (d.coinsFractionalRub || 0))).toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<div class="sig-block">
		<div><strong>Сдал (кассир):</strong> ___________________ (${stmt.cashierFullName})</div>
		<div><strong>Принял:</strong> ___________________ </div>
	</div>
</body>
</html>`;
}
