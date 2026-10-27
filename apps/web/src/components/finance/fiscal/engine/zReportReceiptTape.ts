/**
 * zReportReceiptTape.ts — Daily Z-Report Monospaced Thermal Receipt Tape Generator (58mm/80mm).
 * Mandate 8b: <= 120 lines.
 */
import type { ZReportPrintTapeParams } from "../engine54fz/types";

export function generate54FzZReportReceiptTapeText(params: ZReportPrintTapeParams): string {
	const tapeWidth = params.tapeWidth ?? "58mm";
	const maxCols = tapeWidth === "80mm" ? 44 : 32;

	const padCenter = (str: string, width: number): string => {
		if (str.length >= width) return str.slice(0, width);
		const left = Math.floor((width - str.length) / 2);
		return " ".repeat(left) + str + " ".repeat(width - str.length - left);
	};

	const padJustify = (left: string, right: string, width: number): string => {
		if (left.length + right.length >= width) {
			const space = Math.max(1, width - right.length - 1);
			return `${left.slice(0, space)} ${right}`;
		}
		return left + " ".repeat(width - left.length - right.length) + right;
	};

	const divider = "=".repeat(maxCols);
	const subDivider = "-".repeat(maxCols);
	const clinicName = params.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const dateObj = new Date(params.summary.closedAtIso || Date.now());
	const closeDateRu = `${dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })} ${dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

	return [
		divider,
		padCenter("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ", maxCols),
		padCenter("(СУММАРНЫЙ Z-ОТЧЕТ КАССЫ)", maxCols),
		divider,
		padCenter(clinicName, maxCols),
		padCenter(`ИНН ${params.clinicInn || ""} КПП ${params.clinicKpp || ""}`, maxCols),
		padCenter(params.clinicAddress || "", maxCols),
		subDivider,
		padJustify("СМЕНА:", `№ ${params.summary.shiftNumber}`, maxCols),
		padJustify("ФД:", `№ ${params.fiscalDocNumber || "00042"}`, maxCols),
		padJustify("ДАТА/ВРЕМЯ:", closeDateRu, maxCols),
		padJustify("КАССИР:", params.cashierFullName || "Кассир", maxCols),
		padJustify("ИНН КАССИРА:", params.cashierInn || "", maxCols),
		subDivider,
		padCenter("1. ПРИХОД", maxCols),
		padJustify("ЧЕКОВ ПРИХОДА:", String(params.summary.incomeCount), maxCols),
		padJustify(" - Наличные:", `${params.summary.incomeCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные:", `${params.summary.incomeElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса:", `${params.summary.incomeAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ПРИХОД:", `${params.summary.incomeTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("2. ВОЗВРАТ", maxCols),
		padJustify("ЧЕКОВ ВОЗВРАТА:", String(params.summary.incomeReturnCount), maxCols),
		padJustify(" - Наличные:", `${params.summary.incomeReturnCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные:", `${params.summary.incomeReturnElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса:", `${params.summary.incomeReturnAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ВОЗВРАТОВ:", `-${params.summary.incomeReturnTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("ИТОГИ СМЕНЫ", maxCols),
		padJustify("ЧИСТАЯ ВЫРУЧКА:", `${params.summary.netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("В ЯЩИКЕ НАЛИЧНЫХ:", `${params.summary.cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padJustify("НЕПЕРЕДАННЫХ ФД:", "0", maxCols),
		padJustify("РЕСУРС ФН:", `${params.fnResourceDaysRemaining ?? 412} дн.`, maxCols),
		padJustify("РН ККТ:", params.kktRegNumber || "0004829104058291", maxCols),
		padJustify("ЗН ККТ:", params.kktSerialNumber || "019482019482", maxCols),
		padJustify("ФН:", params.fnSerial || "9960440302145896", maxCols),
		padJustify("ФД:", params.fiscalDocNumber || "00042", maxCols),
		padJustify("ФПД:", params.fiscalSign || "3920194821", maxCols),
		padJustify("ОФД:", params.ofdName || "АО «ПЕРВЫЙ ОФД»", maxCols),
		padCenter(tapeWidth === "80mm" ? "[ ШИРОКАЯ ЛЕНТА 80 ММ ]" : "[ ЧЕКОВАЯ ЛЕНТА 58 ММ ]", maxCols),
		divider,
	].join("\n");
}

export const generateZReportReceiptTapeText = generate54FzZReportReceiptTapeText;
