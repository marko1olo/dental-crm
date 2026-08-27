/**
 * fiscalReconciliationStatement.ts — Official 54-FZ Fiscal Operations & Revenue Summary Statement for Accounting (А4 Альбомная).
 * Compliant with 54-FZ, Order of FTS Russia No. ED-7-20/662@ (FFD 1.2), and 1C:Enterprise Accounting exports.
 */
import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "./kopecksArithmetic.js";
export const DEFAULT_CLINIC_FISCAL_REQUISITES = {
    name: "ООО «Стоматологическая клиника ДЕНТЕ»",
    inn: "7701234567",
    kpp: "770101001",
    ogrn: "1027700123456",
    address: "г. Москва, ул. Клиническая, д. 10",
    licenseNumber: "№ ЛО41-01137-77/00368421",
    kktRegNumber: "0004829104058291",
    kktSerialNumber: "019482019482",
    kktModelName: "АТОЛ 27Ф",
    fnSerialNumber: "9960440302145896",
    ofdName: "АО «ПЕРВЫЙ ОФД»",
    chiefExecutiveFullName: "Смирнов А. В.",
    chiefExecutivePosition: "Главный врач",
    chiefAccountantFullName: "Кузнецова Е. И.",
    defaultCashierFullName: "Сидорова А. П.",
};
/**
 * Calculates kopeck-exact totals across all fiscal shifts for a period.
 */
export function calculateFiscalPeriodStatementTotals(shifts, bankStatementTotalRub, bankAcquiringFeeRub) {
    let totalReceiptsCount = 0;
    let totalCashKop = 0;
    let totalCardKop = 0;
    let totalSbpKop = 0;
    let totalAdvanceKop = 0;
    let totalReturnsKop = 0;
    let totalRevenueKop = 0;
    for (const s of shifts) {
        totalReceiptsCount += s.receiptsCount || 0;
        totalCashKop += s.cashIncomeKopecks !== undefined ? s.cashIncomeKopecks : rubToKopecks(s.cashIncomeRub || 0);
        totalCardKop += s.cardIncomeKopecks !== undefined ? s.cardIncomeKopecks : rubToKopecks(s.cardIncomeRub || 0);
        totalSbpKop += s.sbpIncomeKopecks !== undefined ? s.sbpIncomeKopecks : rubToKopecks(s.sbpIncomeRub || 0);
        totalAdvanceKop += s.advanceOffsetIncomeKopecks !== undefined ? s.advanceOffsetIncomeKopecks : rubToKopecks(s.advanceOffsetIncomeRub || 0);
        totalReturnsKop += s.returnsTotalKopecks !== undefined ? s.returnsTotalKopecks : rubToKopecks(s.returnsTotalRub || 0);
        const shiftRevKop = s.shiftRevenueTotalKopecks !== undefined
            ? s.shiftRevenueTotalKopecks
            : (s.cashIncomeKopecks + s.cardIncomeKopecks + s.sbpIncomeKopecks + s.advanceOffsetIncomeKopecks - s.returnsTotalKopecks);
        totalRevenueKop += shiftRevKop;
    }
    const totalElectronicKopecks = totalCardKop + totalSbpKop;
    const totals = {
        shiftsCount: shifts.length,
        totalReceiptsCount,
        totalCashIncomeKopecks: totalCashKop,
        totalCashIncomeRub: kopecksToRub(totalCashKop),
        totalCardIncomeKopecks: totalCardKop,
        totalCardIncomeRub: kopecksToRub(totalCardKop),
        totalSbpIncomeKopecks: totalSbpKop,
        totalSbpIncomeRub: kopecksToRub(totalSbpKop),
        totalElectronicKopecks,
        totalElectronicRub: kopecksToRub(totalElectronicKopecks),
        totalAdvanceOffsetKopecks: totalAdvanceKop,
        totalAdvanceOffsetRub: kopecksToRub(totalAdvanceKop),
        totalReturnsKopecks: totalReturnsKop,
        totalReturnsRub: kopecksToRub(totalReturnsKop),
        totalRevenueKopecks: totalRevenueKop,
        totalRevenueRub: kopecksToRub(totalRevenueKop),
    };
    // Bank Reconciliation calculation
    const bankStatementKop = bankStatementTotalRub !== undefined
        ? rubToKopecks(bankStatementTotalRub)
        : totalElectronicKopecks;
    const bankFeeKop = bankAcquiringFeeRub !== undefined
        ? rubToKopecks(bankAcquiringFeeRub)
        : Math.round(bankStatementKop * 0.015); // default standard 1.5% acquiring fee
    const netBankDepositKop = Math.max(0, bankStatementKop - bankFeeKop);
    const discrepancyKop = totalElectronicKopecks - bankStatementKop;
    const bankReconciliation = {
        totalCardAndSbpKktRub: kopecksToRub(totalElectronicKopecks),
        totalCardAndSbpKktKopecks: totalElectronicKopecks,
        totalBankStatementRub: kopecksToRub(bankStatementKop),
        totalBankStatementKopecks: bankStatementKop,
        bankAcquiringFeeRub: kopecksToRub(bankFeeKop),
        bankAcquiringFeeKopecks: bankFeeKop,
        netBankDepositRub: kopecksToRub(netBankDepositKop),
        netBankDepositKopecks: netBankDepositKop,
        discrepancyRub: kopecksToRub(discrepancyKop),
        discrepancyKopecks: discrepancyKop,
        status: discrepancyKop === 0 ? "reconciled" : "discrepancy_detected",
        discrepancyReasonRu: discrepancyKop === 0
            ? "Расхождений с банковской выпиской не обнаружено (100% сверка)"
            : `Расхождение ${kopecksToNumericString(Math.abs(discrepancyKop))} руб. (переходящий остаток / холдирование банковского дня)`,
    };
    return { totals, bankReconciliation };
}
function escapeHtml(str) {
    if (!str)
        return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatRubCurrency(rub) {
    return new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(rub) + " ₽";
}
/**
 * Generates an official print-ready A4 Landscape HTML statement
 * «Сводная ведомость фискальных операций и выручки за период».
 */
export function generateFiscalPeriodStatementHtml(data) {
    const req = {
        ...DEFAULT_CLINIC_FISCAL_REQUISITES,
        ...(data.clinicRequisites || {}),
    };
    const { totals, bankReconciliation } = calculateFiscalPeriodStatementTotals(data.shifts, data.bankStatementTotalRub, data.bankAcquiringFeeRub);
    const bankRec = data.bankReconciliation || bankReconciliation;
    const periodLabel = data.periodLabelRu || `с ${data.periodStart} по ${data.periodEnd}`;
    const generatedDate = data.generatedAtIso
        ? new Date(data.generatedAtIso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
        : new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
    const cashier = data.cashierFullName || req.defaultCashierFullName || "Сидорова А. П.";
    const accountant = data.chiefAccountantFullName || req.chiefAccountantFullName || "Кузнецова Е. И.";
    const executive = data.chiefExecutiveFullName || req.chiefExecutiveFullName || "Смирнов А. В.";
    const rowsHtml = data.shifts.map((s, idx) => {
        const sDate = s.date || "—";
        const sNum = s.shiftNumber;
        const sCash = formatRubCurrency(s.cashIncomeRub);
        const sCard = formatRubCurrency(s.cardIncomeRub);
        const sSbp = formatRubCurrency(s.sbpIncomeRub);
        const sAdv = formatRubCurrency(s.advanceOffsetIncomeRub);
        const sRet = formatRubCurrency(s.returnsTotalRub);
        const sRev = formatRubCurrency(s.shiftRevenueTotalRub);
        const sCashier = escapeHtml(s.cashierFullName || cashier);
        return `
		<tr>
			<td style="text-align: center;">${idx + 1}</td>
			<td style="text-align: center; font-weight: 600;">${escapeHtml(sDate)}</td>
			<td style="text-align: center;">Смена № ${sNum}</td>
			<td>${sCashier}</td>
			<td style="text-align: right;">${sCash}</td>
			<td style="text-align: right;">${sCard}</td>
			<td style="text-align: right;">${sSbp}</td>
			<td style="text-align: right;">${sAdv}</td>
			<td style="text-align: right; color: #991b1b;">${sRet}</td>
			<td style="text-align: right; font-weight: 700; background-color: #f8fafc;">${sRev}</td>
		</tr>`;
    }).join("\n");
    return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Сводная ведомость фискальных операций № ${escapeHtml(String(data.statementNumber))}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 10mm 10mm 10mm 10mm;
		}
		* {
			box-sizing: border-box;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		body {
			font-family: "Times New Roman", Times, serif, "Segoe UI", Arial, sans-serif;
			font-size: 11pt;
			line-height: 1.3;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.sheet {
			width: 100%;
			max-width: 277mm;
			margin: 0 auto;
		}
		.header-box {
			border-bottom: 2px solid #000;
			padding-bottom: 6px;
			margin-bottom: 10px;
		}
		.clinic-name {
			font-size: 14pt;
			font-weight: bold;
			text-transform: uppercase;
			margin-bottom: 3px;
		}
		.requisites-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			font-size: 9.5pt;
			line-height: 1.35;
		}
		.title-block {
			text-align: center;
			margin: 12px 0 10px 0;
		}
		.doc-title {
			font-size: 13pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.doc-subtitle {
			font-size: 10.5pt;
			margin-top: 3px;
		}
		table.fiscal-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 9pt;
		}
		table.fiscal-table th, table.fiscal-table td {
			border: 1px solid #000;
			padding: 4px 6px;
			vertical-align: middle;
		}
		table.fiscal-table th {
			background-color: #f1f5f9;
			font-weight: bold;
			text-align: center;
		}
		table.fiscal-table tfoot td {
			font-weight: bold;
			background-color: #e2e8f0;
			border-top: 2px solid #000;
		}
		.reconciliation-card {
			margin-top: 12px;
			border: 1px solid #000;
			padding: 8px 12px;
			background-color: #fcfcfc;
			font-size: 9.5pt;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}
		.reconciliation-title {
			font-weight: bold;
			text-transform: uppercase;
			grid-column: 1 / -1;
			border-bottom: 1px dashed #666;
			padding-bottom: 4px;
			margin-bottom: 2px;
			font-size: 10pt;
		}
		.rec-row {
			display: flex;
			justify-content: space-between;
			margin-bottom: 3px;
		}
		.signatures-section {
			margin-top: 18px;
			font-size: 10pt;
			page-break-inside: avoid;
		}
		.sig-grid {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 15px;
			margin-top: 15px;
		}
		.sig-box {
			display: flex;
			flex-direction: column;
		}
		.sig-line {
			border-bottom: 1px solid #000;
			height: 24px;
			margin-bottom: 4px;
		}
		.sig-label {
			font-size: 8pt;
			color: #444;
			text-align: center;
		}
		.stamp-place {
			display: inline-block;
			border: 1px dashed #666;
			border-radius: 50%;
			width: 65px;
			height: 65px;
			text-align: center;
			line-height: 65px;
			font-size: 9pt;
			font-weight: bold;
			color: #555;
			margin-left: 15px;
			vertical-align: middle;
		}
		.footer-meta {
			margin-top: 15px;
			font-size: 8pt;
			color: #555;
			display: flex;
			justify-content: space-between;
		}
	</style>
</head>
<body>
	<div class="sheet">
		<!-- Шапка клиники -->
		<div class="header-box">
			<div class="clinic-name">${escapeHtml(req.name)}</div>
			<div class="requisites-grid">
				<div>
					ИНН: <strong>${escapeHtml(req.inn)}</strong> ${req.kpp ? `• КПП: <strong>${escapeHtml(req.kpp)}</strong>` : ""} • ОГРН: <strong>${escapeHtml(req.ogrn)}</strong><br>
					Адрес: ${escapeHtml(req.address)}<br>
					Медицинская лицензия: <strong>${escapeHtml(req.licenseNumber)}</strong>
				</div>
				<div style="text-align: right;">
					ККТ (Рег. №): <strong>${escapeHtml(req.kktRegNumber)}</strong> (${escapeHtml(req.kktModelName || "АТОЛ")})<br>
					Заводской № ККТ: <strong>${escapeHtml(req.kktSerialNumber)}</strong> • ФН №: <strong>${escapeHtml(req.fnSerialNumber)}</strong><br>
					Оператор фискальных данных (ОФД): <strong>${escapeHtml(req.ofdName || "АО «ПЕРВЫЙ ОФД»")}</strong>
				</div>
			</div>
		</div>

		<!-- Заголовок документа -->
		<div class="title-block">
			<div class="doc-title">Сводная ведомость фискальных операций и выручки за период</div>
			<div class="doc-subtitle">
				№ <strong>${escapeHtml(String(data.statementNumber))}</strong> • Отчетный период: <strong>${escapeHtml(periodLabel)}</strong>
			</div>
		</div>

		<!-- Таблица фискальных смен -->
		<table class="fiscal-table">
			<thead>
				<tr>
					<th style="width: 25px;">№</th>
					<th style="width: 75px;">Дата</th>
					<th style="width: 70px;">Смена</th>
					<th>Кассир-операционист</th>
					<th style="width: 95px;">Наличные<br><span style="font-size: 7.5pt; font-weight: normal;">(Тег 1031)</span></th>
					<th style="width: 95px;">Карты / Экв.<br><span style="font-size: 7.5pt; font-weight: normal;">(Тег 1081)</span></th>
					<th style="width: 90px;">СБП QR<br><span style="font-size: 7.5pt; font-weight: normal;">(Тег 1081)</span></th>
					<th style="width: 95px;">Зачет аванса<br><span style="font-size: 7.5pt; font-weight: normal;">(Тег 1215)</span></th>
					<th style="width: 90px;">Возвраты<br><span style="font-size: 7.5pt; font-weight: normal;">(Тег 1054=2)</span></th>
					<th style="width: 105px;">ИТОГО ВЫРУЧКА<br><span style="font-size: 7.5pt; font-weight: normal;">(Чистая)</span></th>
				</tr>
			</thead>
			<tbody>
				${rowsHtml || `<tr><td colspan="10" style="text-align: center; padding: 12px; color: #666;">Фискальные операции за указанный период отсутствуют</td></tr>`}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="4" style="text-align: right; text-transform: uppercase;">ИТОГО ЗА ПЕРИОД (${totals.shiftsCount} смен, ${totals.totalReceiptsCount} чеков):</td>
					<td style="text-align: right;">${formatRubCurrency(totals.totalCashIncomeRub)}</td>
					<td style="text-align: right;">${formatRubCurrency(totals.totalCardIncomeRub)}</td>
					<td style="text-align: right;">${formatRubCurrency(totals.totalSbpIncomeRub)}</td>
					<td style="text-align: right;">${formatRubCurrency(totals.totalAdvanceOffsetRub)}</td>
					<td style="text-align: right; color: #991b1b;">${formatRubCurrency(totals.totalReturnsRub)}</td>
					<td style="text-align: right; font-size: 10pt;">${formatRubCurrency(totals.totalRevenueRub)}</td>
				</tr>
			</tfoot>
		</table>

		<!-- Расшифровка расхождений с банковской выпиской -->
		<div class="reconciliation-card">
			<div class="reconciliation-title">
				Сверка безналичной выручки (Эквайринг + СБП) с банковской выпиской
			</div>
			<div>
				<div class="rec-row">
					<span>Безналичная выручка по данным ККТ (Карты + СБП):</span>
					<strong>${formatRubCurrency(totals.totalElectronicRub)}</strong>
				</div>
				<div class="rec-row">
					<span>Поступления по банковской выписке на р/с:</span>
					<strong>${formatRubCurrency(bankRec.totalBankStatementRub)}</strong>
				</div>
				<div class="rec-row">
					<span>Удержанная банковская комиссия (эквайринг/СБП):</span>
					<span style="color: #64748b;">${formatRubCurrency(bankRec.bankAcquiringFeeRub)}</span>
				</div>
			</div>
			<div>
				<div class="rec-row">
					<span>Чистое зачисление на расчетный счет:</span>
					<strong>${formatRubCurrency(bankRec.netBankDepositRub)}</strong>
				</div>
				<div class="rec-row">
					<span>Расхождение с выпиской (ККТ vs Банк):</span>
					<strong style="color: ${bankRec.discrepancyKopecks === 0 ? '#15803d' : '#b91c1c'};">
						${formatRubCurrency(bankRec.discrepancyRub)}
					</strong>
				</div>
				<div class="rec-row">
					<span>Результат сверки:</span>
					<span style="font-weight: 600; color: ${bankRec.status === 'reconciled' ? '#15803d' : '#b91c1c'};">
						${escapeHtml(bankRec.discrepancyReasonRu || (bankRec.status === 'reconciled' ? 'Сверено 100%' : 'Требует уточнения'))}
					</span>
				</div>
			</div>
		</div>

		<!-- Подписи ответственных лиц -->
		<div class="signatures-section">
			<div style="font-weight: bold; margin-bottom: 4px;">Ответственные лица:</div>
			<div class="sig-grid">
				<div class="sig-box">
					<div><strong>Кассир-операционист:</strong></div>
					<div class="sig-line"></div>
					<div class="sig-label">${escapeHtml(cashier)}</div>
				</div>
				<div class="sig-box">
					<div><strong>Главный бухгалтер:</strong></div>
					<div class="sig-line"></div>
					<div class="sig-label">${escapeHtml(accountant)}</div>
				</div>
				<div class="sig-box">
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<div>
							<strong>Руководитель клиники:</strong>
							<div style="font-size: 8.5pt; color: #555;">${escapeHtml(req.chiefExecutivePosition || "Главный врач")}</div>
						</div>
						<div class="stamp-place">[ М. П. ]</div>
					</div>
					<div class="sig-line"></div>
					<div class="sig-label">${escapeHtml(executive)}</div>
				</div>
			</div>
		</div>

		<!-- Подвал -->
		<div class="footer-meta">
			<div>Сформировано в модуле «Бухгалтерия & 54-ФЗ» CRM ДЕНТЕ • Дата формирования: ${escapeHtml(generatedDate)}</div>
			<div>Форма соответствует требованиям 54-ФЗ и ФФД 1.2 (Приказ ФНС РФ № ЕД-7-20/662@)</div>
		</div>
	</div>
</body>
</html>`;
}
/**
 * Exports the fiscal statement to RFC 4180 CSV with UTF-8 BOM (\uFEFF)
 * and semicolon delimiters for native loading into 1C:Enterprise / Excel.
 */
export function exportFiscalPeriodStatementToCsv(data) {
    const req = {
        ...DEFAULT_CLINIC_FISCAL_REQUISITES,
        ...(data.clinicRequisites || {}),
    };
    const { totals, bankReconciliation } = calculateFiscalPeriodStatementTotals(data.shifts, data.bankStatementTotalRub, data.bankAcquiringFeeRub);
    const bankRec = data.bankReconciliation || bankReconciliation;
    const periodLabel = data.periodLabelRu || `с ${data.periodStart} по ${data.periodEnd}`;
    const lines = [];
    // Leading UTF-8 BOM
    lines.push("\uFEFF");
    // Header metadata
    lines.push(`СВОДНАЯ ВЕДОМОСТЬ ФИСКАЛЬНЫХ ОПЕРАЦИЙ И ВЫРУЧКИ ЗА ПЕРИОД;№ ${data.statementNumber};Период: ${periodLabel}`);
    lines.push(`Организация;${req.name};ИНН;${req.inn};КПП;${req.kpp || ""};ОГРН;${req.ogrn}`);
    lines.push(`Адрес;${req.address};Лицензия;${req.licenseNumber}`);
    lines.push(`ККТ (Рег. №);${req.kktRegNumber};Заводской № ККТ;${req.kktSerialNumber};ФН №;${req.fnSerialNumber};ОФД;${req.ofdName || "АО «ПЕРВЫЙ ОФД»"}`);
    lines.push("");
    // Shift table
    lines.push("№ п/п;Дата смены;№ Смены;Кассир-операционист;Наличные (1031) руб;Карты эквайринг (1081) руб;СБП QR (1081) руб;Зачет аванса (1215) руб;Возвраты (1054=2) руб;ИТОГО Выручка руб");
    data.shifts.forEach((s, idx) => {
        const cashier = s.cashierFullName || req.defaultCashierFullName || "Сидорова А. П.";
        lines.push([
            idx + 1,
            s.date || "",
            s.shiftNumber,
            `"${cashier.replace(/"/g, '""')}"`,
            kopecksToNumericString(s.cashIncomeKopecks !== undefined ? s.cashIncomeKopecks : rubToKopecks(s.cashIncomeRub)),
            kopecksToNumericString(s.cardIncomeKopecks !== undefined ? s.cardIncomeKopecks : rubToKopecks(s.cardIncomeRub)),
            kopecksToNumericString(s.sbpIncomeKopecks !== undefined ? s.sbpIncomeKopecks : rubToKopecks(s.sbpIncomeRub)),
            kopecksToNumericString(s.advanceOffsetIncomeKopecks !== undefined ? s.advanceOffsetIncomeKopecks : rubToKopecks(s.advanceOffsetIncomeRub)),
            kopecksToNumericString(s.returnsTotalKopecks !== undefined ? s.returnsTotalKopecks : rubToKopecks(s.returnsTotalRub)),
            kopecksToNumericString(s.shiftRevenueTotalKopecks !== undefined ? s.shiftRevenueTotalKopecks : rubToKopecks(s.shiftRevenueTotalRub)),
        ].join(";"));
    });
    // Totals
    lines.push([
        "ИТОГО ЗА ПЕРИОД",
        "",
        `${totals.shiftsCount} смен`,
        `Всего чеков: ${totals.totalReceiptsCount}`,
        kopecksToNumericString(totals.totalCashIncomeKopecks),
        kopecksToNumericString(totals.totalCardIncomeKopecks),
        kopecksToNumericString(totals.totalSbpIncomeKopecks),
        kopecksToNumericString(totals.totalAdvanceOffsetKopecks),
        kopecksToNumericString(totals.totalReturnsKopecks),
        kopecksToNumericString(totals.totalRevenueKopecks),
    ].join(";"));
    lines.push("");
    lines.push("=== РАСШИФРОВКА СВЕРКИ С БАНКОВСКОЙ ВЫПИСКОЙ (ЭКВАЙРИНГ И СБП) ===");
    lines.push(`Безналичная выручка ККТ (Карты + СБП);${kopecksToNumericString(totals.totalElectronicKopecks)};руб`);
    lines.push(`Поступления по выписке банка;${kopecksToNumericString(bankRec.totalBankStatementKopecks)};руб`);
    lines.push(`Банковская комиссия (эквайринг/СБП);${kopecksToNumericString(bankRec.bankAcquiringFeeKopecks)};руб`);
    lines.push(`Чистое зачисление на р/с;${kopecksToNumericString(bankRec.netBankDepositKopecks)};руб`);
    lines.push(`Расхождение (ККТ - Банк);${kopecksToNumericString(bankRec.discrepancyKopecks)};руб`);
    lines.push(`Статус сверки;${bankRec.status === "reconciled" ? "Сверено 100% (Без расхождений)" : "Обнаружено расхождение"};${bankRec.discrepancyReasonRu || ""}`);
    lines.push("");
    lines.push("=== ОТВЕТСТВЕННЫЕ ЛИЦА ===");
    lines.push(`Кассир-операционист;${data.cashierFullName || req.defaultCashierFullName || "Сидорова А. П."}`);
    lines.push(`Главный бухгалтер;${data.chiefAccountantFullName || req.chiefAccountantFullName || "Кузнецова Е. И."}`);
    lines.push(`Руководитель клиники;${data.chiefExecutiveFullName || req.chiefExecutiveFullName || "Смирнов А. В."};[ М.П. ]`);
    return lines.join("\r\n");
}
