/**
 * monospacedFiscalTapeTemplate.ts — Formatted Monospaced Receipt Tape (58mm / 80mm).
 * Mandate 8b: <= 120 lines. Zero Soviet bureaucracy.
 */
import { kopecksToNumericString, rubToKopecks } from "@dental/shared";
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

	function fmt(val: number): string {
		return `${kopecksToNumericString(rubToKopecks(val))} ₽`;
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
		center("--- ПРИХОД ---"),
		row("Чеков прихода:", String(rec.receiptsCount)),
		row("• Наличные:", fmt(rec.tenders.cashIncomeRub)),
		row("• Банковская карта:", fmt(rec.tenders.cardIncomeRub)),
		row("• Оплата через СБП:", fmt(rec.tenders.sbpIncomeRub)),
		row("• Зачёт аванса / депозита:", fmt(rec.tenders.advanceOffsetIncomeRub)),
		row("ИТОГО ПРИХОД:", fmt(rec.tenders.totalGrossIncomeRub)),
		subLine,
		center("--- ВОЗВРАТ ДЕНЕЖНЫХ СРЕДСТВ ---"),
		row("Чеков возврата:", String(rec.returnsCount)),
		row("• Наличными из кассы:", fmt(rec.tenders.cashReturnRub)),
		row("• На карту / СБП:", fmt(rec.tenders.cardReturnRub + rec.tenders.sbpReturnRub)),
		row("ИТОГО ВОЗВРАТЫ:", fmt(rec.tenders.totalReturnsRub)),
		divLine,
		row("ЧИСТАЯ ВЫРУЧКА:", fmt(rec.tenders.netRevenueRub)),
		divLine,
		center("--- ДЕНЕЖНЫЙ ЯЩИК ---"),
		row("Разменный фонд (утро):", fmt(rec.initialChangeFundRub)),
		row("Расчетный остаток:", fmt(rec.calculatedCashInDrawerRub)),
		row("Фактический пересчет:", fmt(rec.countedCashInDrawerRub)),
		row("Расхождение:", `${rec.differenceRub >= 0 ? "+" : ""}${fmt(rec.differenceRub)}`),
		row("Статус:", rec.status === "balanced" ? "СВЕРЕНО (0.00)" : rec.status === "surplus" ? "ИЗЛИШЕК" : "НЕДОСТАЧА"),
		subLine,
		center("--- ИНКАССАЦИЯ И СЕЙФ ---"),
		row("Сдано в инкассацию:", fmt(rec.encashmentAmountRub)),
		row("Остаток на след. смену:", fmt(rec.retainedNextShiftChangeFundRub)),
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
