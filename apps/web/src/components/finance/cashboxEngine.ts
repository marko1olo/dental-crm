/**
 * cashboxEngine.ts — Unified 54-FZ Cashbox, Shift Lifecycle & Multi-Tender Reconciliation Engine.
 * 
 * Mandates & Standards:
 * - Mandate 8b: Integer kopecks math, zero float loss.
 * - Mandate 8e: Doctor autonomy, 0 disabled buttons, no forced INN for individuals.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 * - 54-FZ (FFD 1.2): Z-reports (с гашением), X-reports (без гашения), Encashment, Multi-tender splits.
 */

import {
	type Kopecks,
	parseKopecks,
	rublesToKopecks,
	kopecksToRubles,
	formatKopecksRu,
} from "@dental/shared";
import {
	compile54FzShiftCloseZReport,
	generate54FzZReportReceiptTapeText,
	type Ffd12ShiftCloseZReportSummary,
	type Ffd12ShiftReceiptRecord,
	type FiscalTapeWidth,
} from "./fiscal/fiscal54fzEngine.js";
import {
	calculateSplitTenders,
	type SplitTenderInput,
	type SplitTenderResult,
} from "../billing/billingMath.js";

export {
	type Ffd12ShiftCloseZReportSummary,
	type Ffd12ShiftReceiptRecord,
	type FiscalTapeWidth,
	compile54FzShiftCloseZReport,
	generate54FzZReportReceiptTapeText,
	calculateSplitTenders,
	type SplitTenderInput,
	type SplitTenderResult,
};

export interface CashShiftOpenInput {
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly initialDrawerFloatRub?: number | undefined;
	readonly openedAtIso?: string | undefined;
}

export interface CashShiftOpenResult {
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly initialDrawerFloatKopecks: Kopecks;
	readonly initialDrawerFloatRub: number;
	readonly openedAtIso: string;
	readonly status: "open";
	readonly message: string;
}

export interface DrawerReconciliationInput {
	readonly countedCashRub: number;
	readonly expectedCashInDrawerRub: number;
}

export interface DrawerReconciliationResult {
	readonly countedCashKopecks: Kopecks;
	readonly countedCashRub: number;
	readonly expectedCashKopecks: Kopecks;
	readonly expectedCashRub: number;
	readonly differenceKopecks: Kopecks;
	readonly differenceRub: number;
	readonly isMatch: boolean;
	readonly isSurplus: boolean;
	readonly isDeficit: boolean;
	readonly statusTextRu: string;
}

export interface EncashmentInput {
	readonly currentDrawerCashRub: number;
	readonly encashmentAmountRub: number;
	readonly cashierFullName: string;
	readonly reasonText?: string | undefined;
}

export interface EncashmentResult {
	readonly encashedKopecks: Kopecks;
	readonly encashedRub: number;
	readonly remainingDrawerKopecks: Kopecks;
	readonly remainingDrawerRub: number;
	readonly cashierFullName: string;
	readonly performedAtIso: string;
	readonly receiptDocNumber: string;
}

/**
 * Открытие кассовой смены с фиксацией разменного фонда (float).
 */
export function openCashboxShift(input: CashShiftOpenInput): CashShiftOpenResult {
	const initialFloatKop = rublesToKopecks(input.initialDrawerFloatRub || 0);
	const openedAt = input.openedAtIso || new Date().toISOString();

	return {
		shiftNumber: input.shiftNumber,
		cashierFullName: input.cashierFullName.trim() || "Дежурный кассир",
		initialDrawerFloatKopecks: initialFloatKop,
		initialDrawerFloatRub: kopecksToRubles(initialFloatKop),
		openedAtIso: openedAt,
		status: "open",
		message: `Кассовая смена №${input.shiftNumber} открыта. Разменный фонд: ${formatKopecksRu(initialFloatKop)}`,
	};
}

/**
 * Сверка фактической наличности в ящике с учетным остатком ККТ 54-ФЗ.
 */
export function reconcileCashDrawer(input: DrawerReconciliationInput): DrawerReconciliationResult {
	const countedKop = rublesToKopecks(input.countedCashRub);
	const expectedKop = rublesToKopecks(input.expectedCashInDrawerRub);
	const diffKop = (countedKop - expectedKop) as Kopecks;
	const diffRub = +(diffKop / 100).toFixed(2);

	const isMatch = diffKop === 0;
	const isSurplus = diffKop > 0;
	const isDeficit = diffKop < 0;

	let statusTextRu = "Касса сходится копейка в копейку (РОВНО)";
	if (isSurplus) {
		statusTextRu = `Излишек в денежном ящике: +${formatKopecksRu(diffKop)}`;
	} else if (isDeficit) {
		statusTextRu = `Недостача в денежном ящике: -${formatKopecksRu(Math.abs(diffKop))}`;
	}

	return {
		countedCashKopecks: countedKop,
		countedCashRub: kopecksToRubles(countedKop),
		expectedCashKopecks: expectedKop,
		expectedCashRub: kopecksToRubles(expectedKop),
		differenceKopecks: diffKop,
		differenceRub: diffRub,
		isMatch,
		isSurplus,
		isDeficit,
		statusTextRu,
	};
}

/**
 * Проведение инкассации / выемки наличных из денежного ящика.
 */
export function performDrawerEncashment(input: EncashmentInput): EncashmentResult {
	const currentKop = rublesToKopecks(input.currentDrawerCashRub);
	const encashKop = Math.min(currentKop, rublesToKopecks(input.encashmentAmountRub)) as Kopecks;
	const remainingKop = (currentKop - encashKop) as Kopecks;

	const nowIso = new Date().toISOString();
	const docSeq = Math.abs(
		(currentKop * 31 + encashKop * 17 + nowIso.length) % 90000 + 10000,
	);

	return {
		encashedKopecks: encashKop,
		encashedRub: kopecksToRubles(encashKop),
		remainingDrawerKopecks: remainingKop,
		remainingDrawerRub: kopecksToRubles(remainingKop),
		cashierFullName: input.cashierFullName || "Кассир",
		performedAtIso: nowIso,
		receiptDocNumber: `ИНК-${docSeq}`,
	};
}

/**
 * Генерация промежуточного отчета без гашения (Х-отчет) в формате чековой ленты.
 */
export function generate54FzXReportTapeText(params: {
	readonly summary: Ffd12ShiftCloseZReportSummary;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly tapeWidth?: FiscalTapeWidth | undefined;
}): string {
	const w = params.tapeWidth === "80mm" ? 48 : 32;
	const line = "-".repeat(w);
	const dline = "=".repeat(w);
	const clinic = (params.clinicLegalName || "ООО «ДЕНТЕ»").slice(0, w);
	const inn = params.clinicInn || "7701234567";
	const cashier = params.cashierFullName || "Кассир";
	const s = params.summary;

	return [
		dline,
		centerText(clinic, w),
		centerText(`ИНН: ${inn}`, w),
		line,
		centerText("Х-ОТЧЕТ БЕЗ ГАШЕНИЯ", w),
		centerText(`СМЕНА № ${s.shiftNumber}`, w),
		line,
		`Кассир: ${cashier}`,
		`ККТ РНМ: ${params.kktRegNumber || "0004829104058291"}`,
		line,
		formatRow("1. ПРИХОД:", `${s.incomeTotalRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("   Наличными:", `${s.incomeCashRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("   Безналичными:", `${s.incomeElectronicRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("   Зачет аванса:", `${s.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("   Чеков прихода:", `${s.incomeCount}`, w),
		line,
		formatRow("2. ВОЗВРАТ ПРИХОДА:", `${s.incomeReturnTotalRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("   Чеков возврата:", `${s.incomeReturnCount}`, w),
		line,
		formatRow("ВЫРУЧКА СМЕНЫ:", `${s.netRevenueRub.toLocaleString("ru-RU")} руб`, w),
		formatRow("В КАССЕ (НАЛ):", `${s.cashInDrawerRub.toLocaleString("ru-RU")} руб`, w),
		dline,
		centerText("*** СМЕНА НЕ ЗАКРЫТА ***", w),
		centerText("ПРОМЕЖУТОЧНЫЙ ИТОГ", w),
		dline,
	].join("\n");
}

function centerText(text: string, width: number): string {
	if (text.length >= width) return text.slice(0, width);
	const pad = Math.floor((width - text.length) / 2);
	return " ".repeat(pad) + text;
}

function formatRow(left: string, right: string, width: number): string {
	const spaceCount = Math.max(1, width - left.length - right.length);
	return left + " ".repeat(spaceCount) + right;
}
