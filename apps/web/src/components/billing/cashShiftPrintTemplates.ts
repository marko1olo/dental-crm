/**
 * cashShiftPrintTemplates.ts — Print HTML templates for Cash Shift Closing, Reconciliation & Cash Orders (KO-1, KO-2).
 *
 * Compliant with:
 * - Bank of Russia Directive No. 3210-U (Cash Operations & Documents KO-1, KO-2)
 * - Federal Law No. 402-FZ "On Accounting"
 * - Mandate 8d: Apple HIG / Clean Printable Typography, Zero Cartoon Emojis
 */

import {
	DEFAULT_CLINIC_FISCAL_DETAILS,
	type CashShiftReconciliationResult,
	type ClinicFiscalDetails,
	type EncashmentStatementData,
	type Ko1CashInflowVoucher,
	type Ko2CashOutflowVoucher,
	type ShiftClosingActData,
} from "./cashShiftClosingEngine.js";

/**
 * Generates print-ready HTML for KO-1 (ПКО).
 */
export function generateKo1Html(v: Ko1CashInflowVoucher): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Приходный кассовый ордер КО-1 № ${v.docNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.3; }
		.header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; }
		.org-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
		.doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 15px 0 5px 0; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 10pt; margin-bottom: 15px; }
		.grid-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		.grid-table td { padding: 6px; border: 1px solid #000; vertical-align: top; }
		.field-row { margin-bottom: 8px; }
		.line { border-bottom: 1px solid #000; display: inline-block; min-width: 150px; }
		.sig-block { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="org-name">${v.clinic.legalName}</div>
		<div>ИНН: ${v.clinic.inn} • Адрес: ${v.clinic.address}</div>
	</div>
	<div class="doc-title">Приходный кассовый ордер (Форма КО-1)</div>
	<div class="doc-subtitle">№ <strong>${v.docNumber}</strong> от <strong>${v.dateRu} г.</strong></div>

	<table class="grid-table">
		<tr>
			<td style="width: 30%;"><strong>Принято от:</strong></td>
			<td>${v.receivedFrom}</td>
		</tr>
		<tr>
			<td><strong>Основание:</strong></td>
			<td>${v.basisRu}</td>
		</tr>
		<tr>
			<td><strong>Сумма цифрами:</strong></td>
			<td style="font-size: 13pt; font-weight: bold;">${v.amountRub.toFixed(2)} руб.</td>
		</tr>
		<tr>
			<td><strong>Сумма прописью:</strong></td>
			<td style="font-weight: bold;">${v.amountWordsRu}</td>
		</tr>
	</table>

	<div class="sig-block">
		<div><strong>Главный бухгалтер:</strong> _________________ (${v.chiefAccountantFullName})</div>
		<div><strong>Кассир:</strong> _________________ (${v.cashierFullName})</div>
	</div>
</body>
</html>`;
}

/**
 * Generates print-ready HTML for KO-2 (РКО).
 */
export function generateKo2Html(v: Ko2CashOutflowVoucher): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Расходный кассовый ордер КО-2 № ${v.docNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.3; }
		.header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; }
		.org-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
		.doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 15px 0 5px 0; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 10pt; margin-bottom: 15px; }
		.grid-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		.grid-table td { padding: 6px; border: 1px solid #000; vertical-align: top; }
		.sig-block { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="org-name">${v.clinic.legalName}</div>
		<div>ИНН: ${v.clinic.inn} • Адрес: ${v.clinic.address}</div>
	</div>
	<div class="doc-title">Расходный кассовый ордер (Форма КО-2)</div>
	<div class="doc-subtitle">№ <strong>${v.docNumber}</strong> от <strong>${v.dateRu} г.</strong></div>

	<table class="grid-table">
		<tr>
			<td style="width: 30%;"><strong>Выдать (кому):</strong></td>
			<td>${v.issuedTo}</td>
		</tr>
		<tr>
			<td><strong>Основание:</strong></td>
			<td>${v.basisRu}</td>
		</tr>
		<tr>
			<td><strong>Сумма цифрами:</strong></td>
			<td style="font-size: 13pt; font-weight: bold;">${v.amountRub.toFixed(2)} руб.</td>
		</tr>
		<tr>
			<td><strong>Сумма прописью:</strong></td>
			<td style="font-weight: bold;">${v.amountWordsRu}</td>
		</tr>
		${v.recipientPassportRu ? `<tr><td><strong>По документу:</strong></td><td>${v.recipientPassportRu}</td></tr>` : ""}
	</table>

	<div class="sig-block">
		<div><strong>Руководитель:</strong> _________________ (${v.chiefExecutiveFullName})</div>
		<div><strong>Главный бухгалтер:</strong> _________________ (${v.chiefAccountantFullName})</div>
		<div><strong>Кассир:</strong> _________________ (${v.cashierFullName})</div>
		<div><strong>Деньги получил:</strong> _________________</div>
	</div>
</body>
</html>`;
}

/**
 * Generates print-ready HTML for Act of Shift Closing.
 */
export function generateShiftClosingActHtml(act: ShiftClosingActData): string {
	const rec = act.reconciliation;
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Акт закрытия кассовой смены № ${rec.shiftNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 10.5pt; color: #000; line-height: 1.25; }
		.header { border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
		.title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9.5pt; }
		th, td { border: 1px solid #000; padding: 4px 6px; }
		th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
		.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; font-size: 10pt; }
	</style>
</head>
<body>
	<div class="header">
		<strong>${act.clinic.legalName}</strong> • ИНН: ${act.clinic.inn} • ККТ: ${act.clinic.kktRegNumber}
	</div>
	<div class="title">Акт закрытия кассовой смены и инвентаризации кассы</div>
	<div style="text-align: center; font-size: 10pt; margin-bottom: 10px;">
		№ <strong>${act.actNumber}</strong> • Смена № <strong>${rec.shiftNumber}</strong> • Дата: <strong>${act.dateRu}</strong>
	</div>

	<table>
		<tr>
			<th colspan="2">1. ФИСКАЛЬНЫЕ ИТОГИ СМЕНЫ 54-ФЗ (ФФД 1.2)</th>
		</tr>
		<tr>
			<td style="width: 60%;">Всего чеков прихода / возврата:</td>
			<td style="font-weight: bold; text-align: right;">${rec.receiptsCount} / ${rec.returnsCount}</td>
		</tr>
		<tr>
			<td>Приход наличными (Тег 1031):</td>
			<td style="text-align: right;">${rec.tenders.cashIncomeRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Приход по банковским картам (Тег 1081):</td>
			<td style="text-align: right;">${rec.tenders.cardIncomeRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Приход через СБП QR (Тег 1081):</td>
			<td style="text-align: right;">${rec.tenders.sbpIncomeRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Зачет авансов и депозитов (Тег 1215):</td>
			<td style="text-align: right;">${rec.tenders.advanceOffsetIncomeRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Возвраты прихода (Тег 1054=2):</td>
			<td style="text-align: right; color: #991b1b;">−${rec.tenders.totalReturnsRub.toFixed(2)} ₽</td>
		</tr>
		<tr style="background: #f8fafc; font-weight: bold;">
			<td>ИТОГО ЧИСТАЯ ВЫРУЧКА СМЕНЫ:</td>
			<td style="text-align: right;">${rec.tenders.netRevenueRub.toFixed(2)} ₽</td>
		</tr>

		<tr>
			<th colspan="2">2. РЕЗУЛЬТАТЫ СВЕРКИ НАЛИЧНОСТИ В КАССОВОМ ЯЩИКЕ</th>
		</tr>
		<tr>
			<td>Разменный фонд на начало смены:</td>
			<td style="text-align: right;">${rec.initialChangeFundRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Расчетный остаток в ящике:</td>
			<td style="text-align: right;">${rec.calculatedCashInDrawerRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Фактическое наличие по пересчету:</td>
			<td style="text-align: right; font-weight: bold;">${rec.countedCashInDrawerRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Результат сверки кассы:</td>
			<td style="font-weight: bold; text-align: right;">
				${rec.status === "balanced" ? "СВЕРЕНО (0.00 ₽)" : `${rec.status === "surplus" ? "ИЗЛИШЕК" : "НЕДОСТАЧА"} (${rec.differenceRub.toFixed(2)} ₽)`}
			</td>
		</tr>
		${rec.isExplanationRequired ? `<tr><td>Причина расхождения:</td><td>${rec.discrepancyReasonLabel}${rec.cashierExplanation ? `<br><em>Объяснение: ${rec.cashierExplanation}</em>` : ""}</td></tr>` : ""}

		<tr>
			<th colspan="2">3. ИНКАССАЦИЯ И ПЕРЕДАЧА ВЫРУЧКИ</th>
		</tr>
		<tr>
			<td>Сдано в инкассацию (сейф/банк):</td>
			<td style="font-weight: bold; text-align: right;">${rec.encashmentAmountRub.toFixed(2)} ₽</td>
		</tr>
		<tr>
			<td>Оставлено в ящике на следующую смену:</td>
			<td style="text-align: right;">${rec.retainedNextShiftChangeFundRub.toFixed(2)} ₽</td>
		</tr>
	</table>

	<div class="sig-grid">
		<div><strong>Кассир-операционист:</strong> ________________ (${rec.cashierFullName})</div>
		<div><strong>Главный бухгалтер:</strong> ________________ (${act.clinic.chiefAccountantFullName})</div>
	</div>
</body>
</html>`;
}

/**
 * Generates print-ready HTML for statement of encashment.
 */
export function generateEncashmentStatementHtml(stmt: EncashmentStatementData): string {
	const d = stmt.denominations;
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Ведомость инкассации № ${stmt.statementNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.3; }
		.header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; }
		.org-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
		.doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 15px 0 5px 0; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 10pt; margin-bottom: 15px; }
		.grid-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		.grid-table th, .grid-table td { padding: 5px 8px; border: 1px solid #000; }
		.grid-table th { background-color: #f1f5f9; text-align: center; }
		.sig-block { margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="org-name">${stmt.clinic.legalName}</div>
		<div>ИНН: ${stmt.clinic.inn} • Адрес: ${stmt.clinic.address}</div>
	</div>
	<div class="doc-title">Ведомость инкассации и передачи выручки</div>
	<div class="doc-subtitle">№ <strong>${stmt.statementNumber}</strong> • Смена № <strong>${stmt.shiftNumber}</strong> от <strong>${stmt.dateRu} г.</strong></div>

	<table class="grid-table">
		<tr>
			<td style="width: 35%;"><strong>Куда передается:</strong></td>
			<td>${stmt.destinationLabel}</td>
		</tr>
		<tr>
			<td><strong>Сейф-пакет / Пломба:</strong></td>
			<td>${stmt.bagNumber || "—"} / ${stmt.sealNumber || "—"}</td>
		</tr>
		<tr>
			<td><strong>Сумма цифрами:</strong></td>
			<td style="font-size: 12pt; font-weight: bold;">${stmt.encashmentAmountRub.toFixed(2)} руб.</td>
		</tr>
		<tr>
			<td><strong>Сумма прописью:</strong></td>
			<td style="font-weight: bold;">${stmt.encashmentAmountWordsRu}</td>
		</tr>
	</table>

	<div style="margin-top: 12px; font-weight: bold; font-size: 10.5pt;">Покупюрная опись вложения:</div>
	<table class="grid-table" style="margin-top: 4px; font-size: 9.5pt;">
		<thead>
			<tr>
				<th>Номинал</th>
				<th>Кол-во</th>
				<th>Сумма (руб.)</th>
				<th>Номинал</th>
				<th>Кол-во</th>
				<th>Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>5 000 ₽</td><td style="text-align: center;">${d.b5000}</td><td style="text-align: right;">${(d.b5000 * 5000).toFixed(2)}</td>
				<td>200 ₽</td><td style="text-align: center;">${d.b200}</td><td style="text-align: right;">${(d.b200 * 200).toFixed(2)}</td>
			</tr>
			<tr>
				<td>2 000 ₽</td><td style="text-align: center;">${d.b2000}</td><td style="text-align: right;">${(d.b2000 * 2000).toFixed(2)}</td>
				<td>100 ₽</td><td style="text-align: center;">${d.b100}</td><td style="text-align: right;">${(d.b100 * 100).toFixed(2)}</td>
			</tr>
			<tr>
				<td>1 000 ₽</td><td style="text-align: center;">${d.b1000}</td><td style="text-align: right;">${(d.b1000 * 1000).toFixed(2)}</td>
				<td>50 ₽</td><td style="text-align: center;">${d.b50}</td><td style="text-align: right;">${(d.b50 * 50).toFixed(2)}</td>
			</tr>
			<tr>
				<td>500 ₽</td><td style="text-align: center;">${d.b500}</td><td style="text-align: right;">${(d.b500 * 500).toFixed(2)}</td>
				<td>Монеты / Мелочь</td><td style="text-align: center;">—</td><td style="text-align: right;">${(d.c10 * 10 + d.c5 * 5 + d.c2 * 2 + d.c1 * 1 + (d.coinsFractionalRub || 0)).toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<div class="sig-block">
		<div>
			<div><strong>Сдал (кассир):</strong> ___________________ (${stmt.cashierFullName})</div>
		</div>
		<div>
			<div><strong>Принял:</strong> ___________________ </div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Generates formatted monospaced fiscal receipt tape (58mm / 80mm) for X-report or Z-report.
 */
export function generateMonospacedTapeText(params: {
	readonly reportType: "x_report" | "z_report";
	readonly reconciliation: CashShiftReconciliationResult;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
	readonly tapeWidth?: "58mm" | "80mm" | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
}): string {
	const {
		reportType,
		reconciliation: rec,
		tapeWidth = "58mm",
		fiscalDocNumber = "00042",
		fiscalSign = "3920194821",
	} = params;

	const clinic: ClinicFiscalDetails = {
		...DEFAULT_CLINIC_FISCAL_DETAILS,
		...(params.clinic || {}),
	};

	const cols = tapeWidth === "80mm" ? 44 : 32;
	const divLine = "=".repeat(cols);
	const subLine = "-".repeat(cols);

	function center(text: string): string {
		if (text.length >= cols) return text.slice(0, cols);
		const pad = Math.floor((cols - text.length) / 2);
		return " ".repeat(pad) + text;
	}

	function row(left: string, right: string): string {
		const gap = cols - left.length - right.length;
		if (gap <= 0) return `${left} ${right}`.slice(0, cols);
		return left + " ".repeat(gap) + right;
	}

	const title = reportType === "z_report" ? "ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z)" : "ПРОМЕЖУТОЧНЫЙ ОТЧЕТ (X)";

	const lines: string[] = [
		center(clinic.legalName),
		center(`ИНН: ${clinic.inn}`),
		center(clinic.address),
		divLine,
		center(title),
		center(`СМЕНА № ${rec.shiftNumber}`),
		subLine,
		row("Открыта:", new Date(rec.openedAtIso).toLocaleString("ru-RU")),
		row("Закрыта:", new Date(rec.closedAtIso).toLocaleString("ru-RU")),
		row("Кассир:", rec.cashierFullName),
		subLine,
		center("--- ПРИХОД (ТЕГ 1054=1) ---"),
		row("Чеков прихода:", String(rec.receiptsCount)),
		row("• Наличными (1031):", `${rec.tenders.cashIncomeRub.toFixed(2)} ₽`),
		row("• Эквайринг (1081):", `${rec.tenders.cardIncomeRub.toFixed(2)} ₽`),
		row("• СБП QR (1081):", `${rec.tenders.sbpIncomeRub.toFixed(2)} ₽`),
		row("• Зачет аванса (1215):", `${rec.tenders.advanceOffsetIncomeRub.toFixed(2)} ₽`),
		row("ИТОГО ПРИХОД:", `${rec.tenders.totalGrossIncomeRub.toFixed(2)} ₽`),
		subLine,
		center("--- ВОЗВРАТ ПРИХОДА (ТЕГ 1054=2) ---"),
		row("Чеков возврата:", String(rec.returnsCount)),
		row("• Наличными из кассы:", `${rec.tenders.cashReturnRub.toFixed(2)} ₽`),
		row("• На карту / СБП:", `${(rec.tenders.cardReturnRub + rec.tenders.sbpReturnRub).toFixed(2)} ₽`),
		row("ИТОГО ВОЗВРАТЫ:", `${rec.tenders.totalReturnsRub.toFixed(2)} ₽`),
		divLine,
		row("ЧИСТАЯ ВЫРУЧКА:", `${rec.tenders.netRevenueRub.toFixed(2)} ₽`),
		divLine,
		center("--- ДЕНЕЖНЫЙ ЯЩИК ---"),
		row("Разменный фонд (утро):", `${rec.initialChangeFundRub.toFixed(2)} ₽`),
		row("Расчетный остаток:", `${rec.calculatedCashInDrawerRub.toFixed(2)} ₽`),
		row("Фактический пересчет:", `${rec.countedCashInDrawerRub.toFixed(2)} ₽`),
		row("Расхождение:", `${rec.differenceRub >= 0 ? "+" : ""}${rec.differenceRub.toFixed(2)} ₽`),
		row("Статус:", rec.status === "balanced" ? "СВЕРЕНО (0.00)" : rec.status === "surplus" ? "ИЗЛИШЕК" : "НЕДОСТАЧА"),
		subLine,
		center("--- ИНКАССАЦИЯ И СЕЙФ ---"),
		row("Сдано в инкассацию:", `${rec.encashmentAmountRub.toFixed(2)} ₽`),
		row("Остаток на след. смену:", `${rec.retainedNextShiftChangeFundRub.toFixed(2)} ₽`),
		divLine,
		row("РН ККТ:", clinic.kktRegNumber),
		row("ЗН ККТ:", clinic.kktSerialNumber),
		row("ФН №:", clinic.fnSerialNumber),
		row("ФД №:", fiscalDocNumber),
		row("ФПД:", fiscalSign),
		row("ОФД:", clinic.ofdName),
		divLine,
		center("СПАСИБО ЗА РАБОТУ!"),
		center("CRM DENTE • 54-ФЗ"),
	];

	return lines.join("\n");
}
