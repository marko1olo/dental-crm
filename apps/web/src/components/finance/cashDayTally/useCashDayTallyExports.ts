import { useState } from "react";
import {
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { CashDaySummary } from "../cashDaySummary";
import {
	generateShiftCloseZReport54Fz,
	type ShiftCloseZReport54FzResult,
} from "../fiscalReceiptEngine";
import { createFiscalStatementShift, formatZReportClipboardText } from "./cashDayTallyStatements";

interface UseCashDayTallyExportsProps {
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly cashierFullName: string;
	readonly dayKey: string;
	readonly summary: CashDaySummary;
}

export function useCashDayTallyExports({
	clinicName,
	clinicInn,
	cashierFullName,
	dayKey,
	summary,
}: UseCashDayTallyExportsProps) {
	const [zReportData, setZReportData] = useState<ShiftCloseZReport54FzResult | null>(null);
	const [isZReportOpen, setIsZReportOpen] = useState(false);
	const [isCopiedZReport, setIsCopiedZReport] = useState(false);

	const handleOpenZReport = () => {
		const report = generateShiftCloseZReport54Fz({
			cashierFullName,
			clinicLegalName: clinicName,
			clinicInn,
			summary,
		});
		setZReportData(report);
		setIsZReportOpen(true);
	};

	const getStatementParams = () => {
		const dateStr = dayKey || new Date().toISOString().slice(0, 10);
		return {
			clinicRequisites: { ...DEFAULT_CLINIC_FISCAL_REQUISITES, name: clinicName, inn: clinicInn },
			statementNumber: `СМЕНА-ДЕНЬ-${dayKey}`,
			periodStart: dateStr,
			periodEnd: dateStr,
			periodLabelRu: `Дневной кассовый отчет за ${new Date().toLocaleDateString("ru-RU")}`,
			shifts: [createFiscalStatementShift(dayKey, cashierFullName, summary)],
			bankStatementTotalRub: summary.cardRub + summary.sbpRub,
			bankAcquiringFeeRub: Math.round((summary.cardRub * 0.015 + summary.sbpRub * 0.007) * 100) / 100,
			cashierFullName,
		};
	};

	const handlePrintAccountingStatement = () => {
		const html = generateFiscalPeriodStatementHtml(getStatementParams());
		const w = window.open("", "_blank");
		if (w) {
			w.document.write(html);
			w.document.close();
			w.focus();
			setTimeout(() => w.print(), 250);
		}
	};

	const handleExport1cCsv = () => {
		const csv = exportFiscalPeriodStatementToCsv(getStatementParams());
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Cash_Day_1C_Export_${dayKey || new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Дневная ведомость выгружена в CSV для 1С:Бухгалтерии (UTF-8 BOM)", "success");
	};

	const handleCopyZReportText = async () => {
		if (!zReportData) return;
		await navigator.clipboard.writeText(formatZReportClipboardText(zReportData));
		setIsCopiedZReport(true);
		setTimeout(() => setIsCopiedZReport(false), 2000);
	};

	return {
		zReportData,
		isZReportOpen,
		setIsZReportOpen,
		isCopiedZReport,
		handleOpenZReport,
		handlePrintAccountingStatement,
		handleExport1cCsv,
		handleCopyZReportText,
	};
}
