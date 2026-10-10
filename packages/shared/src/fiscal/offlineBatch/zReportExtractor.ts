/**
 * zReportExtractor.ts — Z-Report compilation, receipt tape formatting, and FNS QR generation.
 *
 * Compliant with:
 * - Federal Law No. 54-FZ (Art. 4.3 — Maximum 24-hour fiscal shift duration);
 * - Order of FTS Russia No. ED-7-20/662@ (FFD 1.2 Tag 1054, Tag 1081, Tag 1031, Tag 1215).
 */

import type { Ffd12OperationType } from "../ffd12Types.js";
import { kopecksToRub } from "../kopecksArithmetic.js";
import { computePayloadHash } from "../../sync/hashing.js";
import type {
	FiscalShiftZReportData,
	ProcessedFiscalReceiptRecord,
	ProcessOfflineFiscalBatchOptions,
} from "./types.js";

export const MAX_SHIFT_24H_MS = 24 * 60 * 60 * 1000;

export function generateDeterministicFiscalSign(seed: string): string {
	const hash = computePayloadHash({ seed });
	// Extract a 10-digit numeric string for fiscal sign (ФПД)
	let numStr = "";
	for (let i = 0; i < hash.length && numStr.length < 10; i++) {
		const charCode = hash.charCodeAt(i);
		numStr += String(charCode % 10);
	}
	return numStr.padEnd(10, "0");
}

export function buildFnsQrString(params: {
	readonly issuedAtIso: string;
	readonly totalRubFormatted: string;
	readonly fnSerial: string;
	readonly fiscalDocNumber: number;
	readonly fiscalSign: string;
	readonly operationType: Ffd12OperationType;
}): string {
	const dateObj = new Date(params.issuedAtIso);
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const t = `${year}${month}${day}T${hours}${minutes}`;
	const s = params.totalRubFormatted;
	const fn = params.fnSerial;
	const i = String(params.fiscalDocNumber);
	const fp = params.fiscalSign;
	const n = params.operationType === "income_return" ? "2" : "1";

	return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}

export function generateZReportTape(
	zReport: Omit<FiscalShiftZReportData, "zReportTapeText58mm" | "zReportTapeText80mm">,
	options: ProcessOfflineFiscalBatchOptions,
	tapeWidth: "58mm" | "80mm",
): string {
	const maxCols = tapeWidth === "80mm" ? 44 : 32;
	const divider = "=".repeat(maxCols);
	const subDivider = "-".repeat(maxCols);

	const padCenter = (str: string): string => {
		if (str.length >= maxCols) return str.slice(0, maxCols);
		const left = Math.floor((maxCols - str.length) / 2);
		const right = maxCols - str.length - left;
		return " ".repeat(left) + str + " ".repeat(right);
	};

	const padJustify = (left: string, right: string): string => {
		const total = left.length + right.length;
		if (total >= maxCols) {
			const space = Math.max(1, maxCols - right.length - 1);
			return `${left.slice(0, space)} ${right}`;
		}
		const spacesCount = maxCols - left.length - right.length;
		return left + " ".repeat(spacesCount) + right;
	};

	const clinicName = options.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicInn = options.clinicInn || "";
	const kktReg = options.kktRegNumber || "0005423891047123";
	const fnSerial = options.fnSerial || "9960440301849210";

	const lines: string[] = [
		divider,
		padCenter(clinicName),
		...(clinicInn ? [padCenter(`ИНН: ${clinicInn}`)] : []),
		divider,
		padCenter("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z-ОТЧЕТ 54-ФЗ)"),
		padJustify("СМЕНА:", `№ ${zReport.shiftNumber}`),
		padJustify("ОТКРЫТА:", new Date(zReport.openedAtIso).toLocaleString("ru-RU")),
		padJustify("ЗАКРЫТА:", new Date(zReport.closedAtIso).toLocaleString("ru-RU")),
		padJustify("ДЛИТЕЛЬНОСТЬ:", `${zReport.durationHours.toFixed(1)} ч.`),
		subDivider,
		padCenter("1. ПРИХОД (ТЕГ 1054 = 1)"),
		padJustify("  Чеков прихода:", String(zReport.incomeCount)),
		padJustify("  НАЛИЧНЫЕ (1031):", `${zReport.incomeCashRub.toFixed(2)} ₽`),
		padJustify("  БЕЗНАЛИЧНЫЕ (1081):", `${zReport.incomeElectronicRub.toFixed(2)} ₽`),
		padJustify("    в т.ч. Карты:", `${zReport.incomeCardRub.toFixed(2)} ₽`),
		padJustify("    в т.ч. СБП QR:", `${zReport.incomeSbpRub.toFixed(2)} ₽`),
		padJustify("  ЗАЧЕТ АВАНСОВ (1215):", `${zReport.incomeAdvanceOffsetRub.toFixed(2)} ₽`),
		padJustify("  ИТОГО ПРИХОД:", `${zReport.incomeTotalRub.toFixed(2)} ₽`),
		subDivider,
		padCenter("2. ВОЗВРАТ ПРИХОДА (ТЕГ 1054 = 2)"),
		padJustify("  Чеков возврата:", String(zReport.incomeReturnCount)),
		padJustify("  НАЛИЧНЫЕ (1031):", `${zReport.incomeReturnCashRub.toFixed(2)} ₽`),
		padJustify("  БЕЗНАЛИЧНЫЕ (1081):", `${zReport.incomeReturnElectronicRub.toFixed(2)} ₽`),
		padJustify("  ЗАЧЕТ АВАНСОВ (1215):", `${zReport.incomeReturnAdvanceOffsetRub.toFixed(2)} ₽`),
		padJustify("  ИТОГО ВОЗВРАТЫ:", `${zReport.incomeReturnTotalRub.toFixed(2)} ₽`),
		divider,
		padJustify("ЧИСТАЯ ВЫРУЧКА:", `${zReport.netRevenueRub.toFixed(2)} ₽`),
		padJustify("В ЯЩИКЕ НАЛИЧНЫХ:", `${zReport.cashInDrawerRub.toFixed(2)} ₽`),
		subDivider,
		padJustify("ЗН ККТ:", kktReg),
		padJustify("ФН:", fnSerial),
		padJustify("ФД:", String(zReport.zReportDocNumber)),
		padJustify("ФПД:", zReport.zReportFiscalSign),
		divider,
		padCenter(`[ ${tapeWidth === "80mm" ? "ШИРОКАЯ ЛЕНТА 80 ММ" : "ЧЕКОВАЯ ЛЕНТА 58 ММ"} ]`),
	];

	return lines.join("\n");
}

export function compileShiftZReport(
	shiftNumber: number,
	openedAtIso: string,
	closedAtIso: string,
	receipts: readonly ProcessedFiscalReceiptRecord[],
	docNumber: number,
	options: ProcessOfflineFiscalBatchOptions,
): FiscalShiftZReportData {
	let incomeCount = 0;
	let incomeCashKop = 0;
	let incomeCardKop = 0;
	let incomeSbpKop = 0;
	let incomeAdvanceKop = 0;

	let returnCount = 0;
	let returnCashKop = 0;
	let returnElectronicKop = 0;
	let returnAdvanceKop = 0;

	for (const r of receipts) {
		if (r.operationType === "income") {
			incomeCount += 1;
			incomeCashKop += r.cashKopecks;
			incomeCardKop += r.cardKopecks;
			incomeSbpKop += r.sbpKopecks;
			incomeAdvanceKop += r.advanceOffsetKopecks;
		} else if (r.operationType === "income_return") {
			returnCount += 1;
			returnCashKop += r.cashKopecks;
			returnElectronicKop += r.electronicTotalKopecks;
			returnAdvanceKop += r.advanceOffsetKopecks;
		}
	}

	const incomeElectronicKop = incomeCardKop + incomeSbpKop;
	const incomeTotalKop = incomeCashKop + incomeElectronicKop + incomeAdvanceKop;
	const returnTotalKop = returnCashKop + returnElectronicKop + returnAdvanceKop;

	const netRevenueKop = Math.max(0, incomeTotalKop - returnTotalKop);
	const cashInDrawerKop = Math.max(0, incomeCashKop - returnCashKop);

	const openedMs = new Date(openedAtIso).getTime();
	const closedMs = new Date(closedAtIso).getTime();
	const durationHours = Math.max(0.1, (closedMs - openedMs) / (1000 * 60 * 60));

	const zReportSign = generateDeterministicFiscalSign(`z-report-shift-${shiftNumber}-${closedAtIso}`);

	const baseZReport = {
		shiftNumber,
		openedAtIso,
		closedAtIso,
		durationHours,
		totalReceiptsCount: receipts.length,
		incomeCount,
		incomeTotalKopecks: incomeTotalKop,
		incomeTotalRub: kopecksToRub(incomeTotalKop),
		incomeCashKopecks: incomeCashKop,
		incomeCashRub: kopecksToRub(incomeCashKop),
		incomeElectronicKopecks: incomeElectronicKop,
		incomeElectronicRub: kopecksToRub(incomeElectronicKop),
		incomeCardKopecks: incomeCardKop,
		incomeCardRub: kopecksToRub(incomeCardKop),
		incomeSbpKopecks: incomeSbpKop,
		incomeSbpRub: kopecksToRub(incomeSbpKop),
		incomeAdvanceOffsetKopecks: incomeAdvanceKop,
		incomeAdvanceOffsetRub: kopecksToRub(incomeAdvanceKop),

		incomeReturnCount: returnCount,
		incomeReturnTotalKopecks: returnTotalKop,
		incomeReturnTotalRub: kopecksToRub(returnTotalKop),
		incomeReturnCashKopecks: returnCashKop,
		incomeReturnCashRub: kopecksToRub(returnCashKop),
		incomeReturnElectronicKopecks: returnElectronicKop,
		incomeReturnElectronicRub: kopecksToRub(returnElectronicKop),
		incomeReturnAdvanceOffsetKopecks: returnAdvanceKop,
		incomeReturnAdvanceOffsetRub: kopecksToRub(returnAdvanceKop),

		netRevenueKopecks: netRevenueKop,
		netRevenueRub: kopecksToRub(netRevenueKop),
		cashInDrawerKopecks: cashInDrawerKop,
		cashInDrawerRub: kopecksToRub(cashInDrawerKop),
		isBalanced: incomeTotalKop - returnTotalKop === netRevenueKop,
		zReportDocNumber: docNumber,
		zReportFiscalSign: zReportSign,
	};

	return {
		...baseZReport,
		zReportTapeText58mm: generateZReportTape(baseZReport, options, "58mm"),
		zReportTapeText80mm: generateZReportTape(baseZReport, options, "80mm"),
	};
}
