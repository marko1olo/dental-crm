import {
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	exportFiscalPeriodStatementToCsv,
	generateFiscalPeriodStatementHtml,
	type ClinicFiscalRequisites,
	type FiscalShiftSummaryRecord,
} from "@dental/shared";
import { showToast } from "../../../GlobalToast";

export function printBatchAccountingStatement(
	shifts: readonly FiscalShiftSummaryRecord[],
	cashierFullName: string,
	clinicRequisites: Partial<ClinicFiscalRequisites> | undefined,
) {
	const html = generateFiscalPeriodStatementHtml({
		clinicRequisites: clinicRequisites ? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites } : DEFAULT_CLINIC_FISCAL_REQUISITES,
		statementNumber: `BATCH-${Date.now().toString().slice(-6)}`,
		periodStart: shifts[0]?.date || new Date().toISOString().slice(0, 10),
		periodEnd: shifts[shifts.length - 1]?.date || new Date().toISOString().slice(0, 10),
		periodLabelRu: "Пакетная фискализация офлайн-очереди",
		shifts,
		cashierFullName,
	});
	const w = window.open("", "_blank");
	if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250); }
}

export function exportBatch1cCsv(
	shifts: readonly FiscalShiftSummaryRecord[],
	cashierFullName: string,
	clinicRequisites: Partial<ClinicFiscalRequisites> | undefined,
) {
	const csv = exportFiscalPeriodStatementToCsv({
		clinicRequisites: clinicRequisites ? { ...DEFAULT_CLINIC_FISCAL_REQUISITES, ...clinicRequisites } : DEFAULT_CLINIC_FISCAL_REQUISITES,
		statementNumber: `BATCH-${Date.now().toString().slice(-6)}`,
		periodStart: shifts[0]?.date || new Date().toISOString().slice(0, 10),
		periodEnd: shifts[shifts.length - 1]?.date || new Date().toISOString().slice(0, 10),
		periodLabelRu: "Пакетная фискализация офлайн-очереди",
		shifts,
		cashierFullName,
	});
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Fiscal_Batch_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	showToast("CSV-ведомость успешно выгружена для 1С/Excel", "success");
}
