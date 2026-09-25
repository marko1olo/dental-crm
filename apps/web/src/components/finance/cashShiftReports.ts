/**
 * cashShiftReports.ts — Генерация и экспорт печатных форм кассовой смены ККТ 54-ФЗ
 * (Сводная ведомость А4, выгрузка в 1С:Бухгалтерию CSV).
 */

import {
	type ClinicFiscalRequisites,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface CashShiftReportOptions {
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
	readonly totalTurnoverRub: number;
	readonly acquiringFeeRub: number;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
}

export function printAccountingStatement(options: CashShiftReportOptions): void {
	const {
		shiftNumber,
		cashierName,
		cashInDrawerRub,
		cardSumRub,
		sbpSumRub,
		advanceOffsetRub,
		totalTurnoverRub,
		acquiringFeeRub,
		clinicRequisites,
	} = options;

	const html = generateFiscalPeriodStatementHtml({
		clinicRequisites: clinicRequisites
			? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
			: DEFAULT_CLINIC_FISCAL_REQUISITES,
		statementNumber: `СМЕНА-${shiftNumber}`,
		periodStart: new Date().toISOString().slice(0, 10),
		periodEnd: new Date().toISOString().slice(0, 10),
		periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
		shifts: [
			{
				shiftNumber,
				date: new Date().toISOString().slice(0, 10),
				cashierFullName: cashierName,
				receiptsCount: 12,
				cashIncomeRub: cashInDrawerRub,
				cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
				cardIncomeRub: cardSumRub,
				cardIncomeKopecks: Math.round(cardSumRub * 100),
				sbpIncomeRub: sbpSumRub,
				sbpIncomeKopecks: Math.round(sbpSumRub * 100),
				advanceOffsetIncomeRub: advanceOffsetRub,
				advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
				returnsTotalRub: 0,
				returnsTotalKopecks: 0,
				shiftRevenueTotalRub: totalTurnoverRub,
				shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
			},
		],
		bankStatementTotalRub: cardSumRub + sbpSumRub,
		bankAcquiringFeeRub: acquiringFeeRub,
		cashierFullName: cashierName,
	});

	const w = window.open("", "_blank");
	if (w) {
		w.document.write(html);
		w.document.close();
		w.focus();
		setTimeout(() => w.print(), 250);
	}
}

export function exportShift1cCsv(options: CashShiftReportOptions): void {
	const {
		shiftNumber,
		cashierName,
		cashInDrawerRub,
		cardSumRub,
		sbpSumRub,
		advanceOffsetRub,
		totalTurnoverRub,
		acquiringFeeRub,
		clinicRequisites,
	} = options;

	const csv = exportFiscalPeriodStatementToCsv({
		clinicRequisites: clinicRequisites
			? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites }
			: DEFAULT_CLINIC_FISCAL_REQUISITES,
		statementNumber: `СМЕНА-${shiftNumber}`,
		periodStart: new Date().toISOString().slice(0, 10),
		periodEnd: new Date().toISOString().slice(0, 10),
		periodLabelRu: `Кассовая смена №${shiftNumber} (${new Date().toLocaleDateString("ru-RU")})`,
		shifts: [
			{
				shiftNumber,
				date: new Date().toISOString().slice(0, 10),
				cashierFullName: cashierName,
				receiptsCount: 12,
				cashIncomeRub: cashInDrawerRub,
				cashIncomeKopecks: Math.round(cashInDrawerRub * 100),
				cardIncomeRub: cardSumRub,
				cardIncomeKopecks: Math.round(cardSumRub * 100),
				sbpIncomeRub: sbpSumRub,
				sbpIncomeKopecks: Math.round(sbpSumRub * 100),
				advanceOffsetIncomeRub: advanceOffsetRub,
				advanceOffsetIncomeKopecks: Math.round(advanceOffsetRub * 100),
				returnsTotalRub: 0,
				returnsTotalKopecks: 0,
				shiftRevenueTotalRub: totalTurnoverRub,
				shiftRevenueTotalKopecks: Math.round(totalTurnoverRub * 100),
			},
		],
		bankStatementTotalRub: cardSumRub + sbpSumRub,
		bankAcquiringFeeRub: acquiringFeeRub,
		cashierFullName: cashierName,
	});

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Fiscal_Shift_${shiftNumber}_1C_Export_${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	showToast("Ведомость смены успешно выгружена для 1С:Бухгалтерии (UTF-8 BOM)", "success");
}
