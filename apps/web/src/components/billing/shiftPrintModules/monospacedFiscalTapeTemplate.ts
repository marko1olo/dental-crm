/**
 * monospacedFiscalTapeTemplate.ts — Formatted Monospaced Receipt Tape (58mm / 80mm).
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy.
 */
import {
	type CashShiftReconciliationResult,
	type ClinicFiscalDetails,
	DEFAULT_CLINIC_FISCAL_DETAILS,
} from "./types.js";

export interface FiscalTapeParams {
	readonly reportType: "x_report" | "z_report";
	readonly reconciliation: CashShiftReconciliationResult;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
	readonly tapeWidth?: "58mm" | "80mm" | undefined;
	readonly fiscalDocNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
}

export function generateMonospacedTapeText(params: FiscalTapeParams): string {
	const { reportType, reconciliation: rec, tapeWidth = "58mm", fiscalDocNumber = "00042", fiscalSign = "3920194821" } = params;
	const clinic: ClinicFiscalDetails = { ...DEFAULT_CLINIC_FISCAL_DETAILS, ...(params.clinic || {}) };
	const cols = tapeWidth === "80mm" ? 44 : 32;
	const divLine = "=".repeat(cols);
	const subLine = "-".repeat(cols);

	function center(text?: string): string {
		const str = String(text ?? "");
		if (str.length >= cols) return str.slice(0, cols);
		const pad = Math.floor((cols - str.length) / 2);
		return " ".repeat(pad) + str;
	}

	function row(left?: string, right?: string): string {
		const l = String(left ?? "");
		const r = String(right ?? "");
		const gap = cols - l.length - r.length;
		if (gap <= 0) return `${l} ${r}`.slice(0, cols);
		return l + " ".repeat(gap) + r;
	}

	const title = reportType === "z_report" ? "ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z)" : "ПРОМЕЖУТОЧНЫЙ ОТЧЕТ (X)";

	return [
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
		center("CRM DENTE • Касса и чеки"),
	].join("\n");
}
