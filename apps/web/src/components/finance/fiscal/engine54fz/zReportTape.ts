import type { ZReportPrintTapeParams } from "./types";

/**
 * 54-FZ FFD 1.2: Generates formatted text representation of daily Z-report
 * for standard 58mm (32 chars/line) or 80mm (42-48 chars/line) thermal receipt printers.
 */
export function generate54FzZReportReceiptTapeText(params: ZReportPrintTapeParams): string {
	const tapeWidth = params.tapeWidth ?? "58mm";
	const maxCols = tapeWidth === "80mm" ? 44 : 32;

	const padCenter = (str: string, width: number): string => {
		if (str.length >= width) return str.slice(0, width);
		const left = Math.floor((width - str.length) / 2);
		const right = width - str.length - left;
		return " ".repeat(left) + str + " ".repeat(right);
	};

	const padJustify = (left: string, right: string, width: number): string => {
		const total = left.length + right.length;
		if (total >= width) {
			const space = Math.max(1, width - right.length - 1);
			return `${left.slice(0, space)} ${right}`;
		}
		const spacesCount = width - left.length - right.length;
		return left + " ".repeat(spacesCount) + right;
	};

	const divider = "=".repeat(maxCols);
	const subDivider = "-".repeat(maxCols);

	const clinicName = params.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = params.clinicInn || "";
	const clinicKpp = params.clinicKpp || "";
	const clinicAddr = params.clinicAddress || "";
	const cashier = params.cashierFullName || "Кассир-администратор";
	const cashierInn = params.cashierInn || "";
	const kktReg = params.kktRegNumber || "0004829104058291";
	const kktSerial = params.kktSerialNumber || "019482019482";
	const fnSerial = params.fnSerial || "9960440302145896";
	const fdNum = params.fiscalDocNumber || "00042";
	const fpd = params.fiscalSign || "3920194821";
	const ofd = params.ofdName || "АО «ПЕРВЫЙ ОФД»";
	const fnDays = params.fnResourceDaysRemaining ?? 412;

	const dateObj = new Date(params.summary.closedAtIso || Date.now());
	const closeDateRu = `${dateObj.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	})} ${dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})}`;

	const lines: string[] = [
		divider,
		padCenter("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ", maxCols),
		padCenter("(СУММАРНЫЙ СМЕННЫЙ Z-ОТЧЕТ КАССЫ)", maxCols),
		divider,
		padCenter(clinicName, maxCols),
		padCenter(`ИНН ${clinicInn} КПП ${clinicKpp}`, maxCols),
		padCenter(clinicAddr, maxCols),
		subDivider,
		padJustify("СМЕНА:", `№ ${params.summary.shiftNumber}`, maxCols),
		padJustify("ФД:", `№ ${fdNum}`, maxCols),
		padJustify("ДАТА/ВРЕМЯ:", closeDateRu, maxCols),
		padJustify("КАССИР:", cashier, maxCols),
		padJustify("ИНН КАССИРА:", cashierInn, maxCols),
		subDivider,
		padCenter("1. ПРИХОД (ТЕГ 1054 = 1)", maxCols),
		padJustify("ЧЕКОВ ПРИХОДА:", String(params.summary.incomeCount), maxCols),
		padJustify(" - Наличные (1031):", `${params.summary.incomeCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные (1081):", `${params.summary.incomeElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса (1215):", `${params.summary.incomeAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ПРИХОД:", `${params.summary.incomeTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("2. ВОЗВРАТ (ТЕГ 1054 = 2)", maxCols),
		padJustify("ЧЕКОВ ВОЗВРАТА:", String(params.summary.incomeReturnCount), maxCols),
		padJustify(" - Наличные (1031):", `${params.summary.incomeReturnCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Безналичные (1081):", `${params.summary.incomeReturnElectronicRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify(" - Зачет аванса (1215):", `${params.summary.incomeReturnAdvanceOffsetRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("ИТОГО ВОЗВРАТОВ:", `-${params.summary.incomeReturnTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padCenter("ИТОГИ СМЕНЫ", maxCols),
		padJustify("ЧИСТАЯ ВЫРУЧКА:", `${params.summary.netRevenueRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		padJustify("В ЯЩИКЕ НАЛИЧНЫХ:", `${params.summary.cashInDrawerRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`, maxCols),
		subDivider,
		padJustify("НЕПЕРЕДАННЫХ ФД:", "0", maxCols),
		padJustify("РЕСУРС ФН:", `${fnDays} дн.`, maxCols),
		padJustify("РН ККТ:", kktReg, maxCols),
		padJustify("ЗН ККТ:", kktSerial, maxCols),
		padJustify("ФН:", fnSerial, maxCols),
		padJustify("ФД:", fdNum, maxCols),
		padJustify("ФПД:", fpd, maxCols),
		padJustify("ОФД:", ofd, maxCols),
		padCenter(tapeWidth === "80mm" ? "[ ШИРОКАЯ ЛЕНТА 80 ММ ]" : "[ ЧЕКОВАЯ ЛЕНТА 58 ММ ]", maxCols),
		divider,
	];

	return lines.join("\n");
}
