/**
 * offlineFiscalBatchReconciler.ts — 54-FZ (FFD 1.2) Offline Fiscal Batch Processing & Banking Reconciler.
 *
 * Compliant with:
 * - Federal Law No. 54-FZ (Art. 4.3 — Maximum 24-hour fiscal shift duration);
 * - Order of FTS Russia No. ED-7-20/662@ (FFD 1.2 Tag 1054, Tag 1081, Tag 1031, Tag 1215);
 * - Order of Minzdrav of Russia No. 804n.
 *
 * Guarantees:
 * 1. Strict idempotency via unique IDs and canonical SHA-256 payload signatures.
 * 2. Automatic partitioning into 24-hour fiscal shifts with statutory Z-reports.
 * 3. Exact kopeck arithmetic without floating-point drift.
 * 4. Automatic reconciliation between Banking Registry (Acquiring/SBP) and Fiscal Z-Reports.
 */

import type {
	Ffd12OperationType,
	Ffd12PaymentMethod,
	Ffd12PaymentSubject,
	Ffd12QuantityMeasure,
	Ffd12TaxationSystem,
	Ffd12VatRate,
} from "./ffd12Types.js";
import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "./kopecksArithmetic.js";
import { computePayloadHash } from "../sync/hashing.js";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface OfflineQueueFiscalItem {
	readonly id: string;
	readonly paymentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly receiptId?: string | undefined;
	readonly patientId: string;
	readonly patientFullName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly timestampIso: string;
	readonly operationType: Ffd12OperationType;
	readonly items: readonly {
		readonly id?: string | undefined;
		readonly name: string;
		readonly priceRub: number;
		readonly quantity?: number | undefined;
		readonly discountRub?: number | undefined;
		readonly subject?: Ffd12PaymentSubject | undefined;
		readonly method?: Ffd12PaymentMethod | undefined;
		readonly vatRate?: Ffd12VatRate | undefined;
		readonly measure?: Ffd12QuantityMeasure | undefined;
		readonly markingCode?: string | undefined;
		readonly medicalServiceCode804n?: string | undefined;
		readonly toothNumber?: string | number | undefined;
	}[];
	readonly tenders: {
		readonly cashRub?: number | undefined;
		readonly cardRub?: number | undefined;
		readonly sbpRub?: number | undefined;
		readonly advanceOffsetRub?: number | undefined;
		readonly creditPostpaymentRub?: number | undefined;
		readonly certificateRub?: number | undefined;
	};
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly idempotencyKey?: string | undefined;
	readonly payloadSignature?: string | undefined;
}

export interface BankRegistryTransaction {
	readonly transactionId: string;
	readonly dateIso: string;
	readonly amountRub: number;
	readonly amountKopecks?: number | undefined;
	readonly type: "card" | "sbp";
	readonly terminalId?: string | undefined;
	readonly rrn?: string | undefined;
	readonly authCode?: string | undefined;
	readonly panMasked?: string | undefined;
}

export interface ProcessOfflineFiscalBatchOptions {
	readonly startingShiftNumber?: number | undefined;
	readonly startingFiscalDocNumber?: number | undefined;
	readonly existingProcessedIds?: ReadonlySet<string> | readonly string[] | undefined;
	readonly existingPayloadSignatures?: ReadonlySet<string> | readonly string[] | undefined;
	readonly bankRegistry?: readonly BankRegistryTransaction[] | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly maxShiftDurationMs?: number | undefined; // Default: 24 hours (86_400_000 ms)
}

export interface ProcessedFiscalReceiptRecord {
	readonly queueItemId: string;
	readonly paymentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly patientId: string;
	readonly patientFullName?: string | undefined;
	readonly fiscalDocNumber: number;
	readonly fiscalSign: string;
	readonly shiftNumber: number;
	readonly receiptNumberInShift: number;
	readonly issuedAtIso: string;
	readonly operationType: Ffd12OperationType;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly cashRub: number;
	readonly cashKopecks: number;
	readonly cardRub: number;
	readonly cardKopecks: number;
	readonly sbpRub: number;
	readonly sbpKopecks: number;
	readonly electronicTotalRub: number;
	readonly electronicTotalKopecks: number;
	readonly advanceOffsetRub: number;
	readonly advanceOffsetKopecks: number;
	readonly creditPostpaymentRub: number;
	readonly creditPostpaymentKopecks: number;
	readonly fnsQrString: string;
	readonly idempotencyKey: string;
	readonly payloadSignature: string;
	readonly status: "processed";
}

export interface SkippedDuplicateFiscalRecord {
	readonly queueItemId: string;
	readonly paymentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly reason: "duplicate_id" | "duplicate_signature" | "duplicate_idempotency_key";
	readonly duplicateKey: string;
	readonly status: "skipped_duplicate";
}

export interface FailedFiscalRecord {
	readonly queueItemId: string;
	readonly error: string;
	readonly status: "failed_error";
}

export interface FiscalShiftZReportData {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso: string;
	readonly durationHours: number;
	readonly totalReceiptsCount: number;
	readonly incomeCount: number;
	readonly incomeTotalKopecks: number;
	readonly incomeTotalRub: number;
	readonly incomeCashKopecks: number;
	readonly incomeCashRub: number;
	readonly incomeElectronicKopecks: number;
	readonly incomeElectronicRub: number;
	readonly incomeCardKopecks: number;
	readonly incomeCardRub: number;
	readonly incomeSbpKopecks: number;
	readonly incomeSbpRub: number;
	readonly incomeAdvanceOffsetKopecks: number;
	readonly incomeAdvanceOffsetRub: number;

	readonly incomeReturnCount: number;
	readonly incomeReturnTotalKopecks: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnCashKopecks: number;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnElectronicKopecks: number;
	readonly incomeReturnElectronicRub: number;
	readonly incomeReturnAdvanceOffsetKopecks: number;
	readonly incomeReturnAdvanceOffsetRub: number;

	readonly netRevenueKopecks: number;
	readonly netRevenueRub: number;
	readonly cashInDrawerKopecks: number;
	readonly cashInDrawerRub: number;
	readonly isBalanced: boolean;
	readonly zReportDocNumber: number;
	readonly zReportFiscalSign: string;
	readonly zReportTapeText58mm: string;
	readonly zReportTapeText80mm: string;
}

export interface BatchShiftContainer {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso: string;
	readonly receipts: readonly ProcessedFiscalReceiptRecord[];
	readonly zReport: FiscalShiftZReportData;
}

export interface BankingReconciliationSummary {
	readonly bankTransactionsCount: number;
	readonly bankTotalKopecks: number;
	readonly bankTotalRub: number;
	readonly bankCardKopecks: number;
	readonly bankCardRub: number;
	readonly bankSbpKopecks: number;
	readonly bankSbpRub: number;

	readonly fiscalElectronicKopecks: number;
	readonly fiscalElectronicRub: number;
	readonly fiscalCardKopecks: number;
	readonly fiscalCardRub: number;
	readonly fiscalSbpKopecks: number;
	readonly fiscalSbpRub: number;

	readonly discrepancyKopecks: number;
	readonly discrepancyRub: number;
	readonly isMatched: boolean;
	readonly status: "reconciled_exact" | "discrepancy_detected";
	readonly summaryText: string;
	readonly unmatchedBankTransactions: readonly BankRegistryTransaction[];
	readonly unmatchedFiscalReceipts: readonly ProcessedFiscalReceiptRecord[];
}

export interface OfflineFiscalBatchResult {
	readonly batchId: string;
	readonly processedAtIso: string;
	readonly totalItemsCount: number;
	readonly processedCount: number;
	readonly duplicateCount: number;
	readonly failedCount: number;
	readonly totalGrossKopecks: number;
	readonly totalGrossRub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly totalCashKopecks: number;
	readonly totalCashRub: number;
	readonly totalElectronicKopecks: number;
	readonly totalElectronicRub: number;
	readonly totalAdvanceOffsetKopecks: number;
	readonly totalAdvanceOffsetRub: number;
	readonly shifts: readonly BatchShiftContainer[];
	readonly processedReceipts: readonly ProcessedFiscalReceiptRecord[];
	readonly skippedDuplicates: readonly SkippedDuplicateFiscalRecord[];
	readonly failedRecords: readonly FailedFiscalRecord[];
	readonly reconciliation: BankingReconciliationSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SHIFT_24H_MS = 24 * 60 * 60 * 1000;

function computeItemSignature(item: OfflineQueueFiscalItem): string {
	const canonicalPayload = {
		id: item.id,
		paymentId: item.paymentId ?? null,
		invoiceId: item.invoiceId ?? null,
		patientId: item.patientId,
		operationType: item.operationType,
		items: item.items.map((it) => ({
			name: it.name.trim(),
			priceKopecks: rubToKopecks(it.priceRub),
			quantity: it.quantity ?? 1,
			discountKopecks: it.discountRub ? rubToKopecks(it.discountRub) : 0,
		})),
		tenders: {
			cashKopecks: item.tenders.cashRub ? rubToKopecks(item.tenders.cashRub) : 0,
			cardKopecks: item.tenders.cardRub ? rubToKopecks(item.tenders.cardRub) : 0,
			sbpKopecks: item.tenders.sbpRub ? rubToKopecks(item.tenders.sbpRub) : 0,
			advanceKopecks: item.tenders.advanceOffsetRub ? rubToKopecks(item.tenders.advanceOffsetRub) : 0,
		},
	};
	return computePayloadHash(canonicalPayload);
}

function generateDeterministicFiscalSign(seed: string): string {
	const hash = computePayloadHash({ seed });
	// Extract a 10-digit numeric string for fiscal sign (ФПД)
	let numStr = "";
	for (let i = 0; i < hash.length && numStr.length < 10; i++) {
		const charCode = hash.charCodeAt(i);
		numStr += String(charCode % 10);
	}
	return numStr.padEnd(10, "0");
}

function buildFnsQrString(params: {
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

function generateZReportTape(
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
	const clinicInn = options.clinicInn || "7701234567";
	const kktReg = options.kktRegNumber || "0005423891047123";
	const fnSerial = options.fnSerial || "9960440301849210";

	const lines: string[] = [
		divider,
		padCenter(clinicName),
		padCenter(`ИНН: ${clinicInn}`),
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

function compileShiftZReport(
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

function reconcileWithBankingRegistry(
	fiscalReceipts: readonly ProcessedFiscalReceiptRecord[],
	bankRegistry: readonly BankRegistryTransaction[] | undefined,
): BankingReconciliationSummary {
	if (!bankRegistry || bankRegistry.length === 0) {
		const fiscalElectronicKop = fiscalReceipts.reduce((acc, r) => acc + r.electronicTotalKopecks, 0);
		const fiscalCardKop = fiscalReceipts.reduce((acc, r) => acc + r.cardKopecks, 0);
		const fiscalSbpKop = fiscalReceipts.reduce((acc, r) => acc + r.sbpKopecks, 0);

		return {
			bankTransactionsCount: 0,
			bankTotalKopecks: 0,
			bankTotalRub: 0,
			bankCardKopecks: 0,
			bankCardRub: 0,
			bankSbpKopecks: 0,
			bankSbpRub: 0,
			fiscalElectronicKopecks: fiscalElectronicKop,
			fiscalElectronicRub: kopecksToRub(fiscalElectronicKop),
			fiscalCardKopecks: fiscalCardKop,
			fiscalCardRub: kopecksToRub(fiscalCardKop),
			fiscalSbpKopecks: fiscalSbpKop,
			fiscalSbpRub: kopecksToRub(fiscalSbpKop),
			discrepancyKopecks: -fiscalElectronicKop,
			discrepancyRub: -kopecksToRub(fiscalElectronicKop),
			isMatched: fiscalElectronicKop === 0,
			status: fiscalElectronicKop === 0 ? "reconciled_exact" : "discrepancy_detected",
			summaryText:
				fiscalElectronicKop === 0
					? "Сверка без расхождений: 0.00 ₽ (Безналичных операций не зафиксировано)"
					: `Реестр банка не предоставлен. Фискализировано по безналичному расчету (Тег 1081): ${kopecksToRub(fiscalElectronicKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
			unmatchedBankTransactions: [],
			unmatchedFiscalReceipts: fiscalReceipts.filter((r) => r.electronicTotalKopecks > 0),
		};
	}

	let bankCardKop = 0;
	let bankSbpKop = 0;

	for (const t of bankRegistry) {
		const kop = t.amountKopecks !== undefined ? t.amountKopecks : rubToKopecks(t.amountRub);
		if (t.type === "card") {
			bankCardKop += kop;
		} else if (t.type === "sbp") {
			bankSbpKop += kop;
		}
	}

	const bankTotalKop = bankCardKop + bankSbpKop;

	let fiscalCardKop = 0;
	let fiscalSbpKop = 0;

	for (const r of fiscalReceipts) {
		if (r.operationType === "income") {
			fiscalCardKop += r.cardKopecks;
			fiscalSbpKop += r.sbpKopecks;
		} else if (r.operationType === "income_return") {
			fiscalCardKop -= r.cardKopecks;
			fiscalSbpKop -= r.sbpKopecks;
		}
	}

	const fiscalElectronicKop = fiscalCardKop + fiscalSbpKop;
	const discrepancyKop = bankTotalKop - fiscalElectronicKop;
	const isMatched = discrepancyKop === 0;

	const status = isMatched ? "reconciled_exact" : "discrepancy_detected";

	let summaryText: string;
	if (isMatched) {
		summaryText = `Сверка без расхождений: 0.00 ₽ (100% совпадение с банковским реестром на сумму ${kopecksToRub(bankTotalKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`;
	} else {
		const diffRub = kopecksToRub(discrepancyKop);
		const sign = diffRub > 0 ? "+" : "";
		summaryText = `Обнаружено расхождение: ${sign}${diffRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ (В реестре банка: ${kopecksToRub(bankTotalKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽, по фискальным чекам: ${kopecksToRub(fiscalElectronicKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`;
	}

	return {
		bankTransactionsCount: bankRegistry.length,
		bankTotalKopecks: bankTotalKop,
		bankTotalRub: kopecksToRub(bankTotalKop),
		bankCardKopecks: bankCardKop,
		bankCardRub: kopecksToRub(bankCardKop),
		bankSbpKopecks: bankSbpKop,
		bankSbpRub: kopecksToRub(bankSbpKop),
		fiscalElectronicKopecks: fiscalElectronicKop,
		fiscalElectronicRub: kopecksToRub(fiscalElectronicKop),
		fiscalCardKopecks: fiscalCardKop,
		fiscalCardRub: kopecksToRub(fiscalCardKop),
		fiscalSbpKopecks: fiscalSbpKop,
		fiscalSbpRub: kopecksToRub(fiscalSbpKop),
		discrepancyKopecks: discrepancyKop,
		discrepancyRub: kopecksToRub(discrepancyKop),
		isMatched,
		status,
		summaryText,
		unmatchedBankTransactions: isMatched ? [] : bankRegistry,
		unmatchedFiscalReceipts: isMatched ? [] : fiscalReceipts.filter((r) => r.electronicTotalKopecks > 0),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE: processOfflineFiscalBatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes an offline batch of payments/receipts:
 * - Checks idempotency (prevents duplicate fiscal documents);
 * - Auto-partitions items into 24-hour fiscal shifts according to 54-FZ (Art. 4.3);
 * - Generates statutory receipts, Z-reports, and FNS QR codes;
 * - Reconciles electronic totals with the bank acquiring/SBP statement.
 */
export function processOfflineFiscalBatch(
	queueItems: readonly OfflineQueueFiscalItem[],
	options: ProcessOfflineFiscalBatchOptions = {},
): OfflineFiscalBatchResult {
	const batchId = `BATCH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
	const processedAtIso = new Date().toISOString();
	const maxShiftDuration = options.maxShiftDurationMs ?? MAX_SHIFT_24H_MS;

	const seenIds = new Set<string>();
	if (options.existingProcessedIds) {
		for (const id of options.existingProcessedIds) {
			seenIds.add(id);
		}
	}

	const seenSignatures = new Set<string>();
	if (options.existingPayloadSignatures) {
		for (const sig of options.existingPayloadSignatures) {
			seenSignatures.add(sig);
		}
	}

	const skippedDuplicates: SkippedDuplicateFiscalRecord[] = [];
	const failedRecords: FailedFiscalRecord[] = [];
	const validItemsToProcess: Array<{ item: OfflineQueueFiscalItem; signature: string; timestampMs: number }> = [];

	// Step 1: Idempotency & Deduplication
	for (const item of queueItems) {
		if (seenIds.has(item.id)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.id,
				status: "skipped_duplicate",
			});
			continue;
		}

		if (item.paymentId && seenIds.has(item.paymentId)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.paymentId,
				status: "skipped_duplicate",
			});
			continue;
		}

		if (item.invoiceId && seenIds.has(item.invoiceId)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.invoiceId,
				status: "skipped_duplicate",
			});
			continue;
		}

		const signature = item.payloadSignature ?? computeItemSignature(item);
		if (seenSignatures.has(signature)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_signature",
				duplicateKey: signature,
				status: "skipped_duplicate",
			});
			continue;
		}

		// Check timestamp validity
		const itemTime = new Date(item.timestampIso).getTime();
		if (Number.isNaN(itemTime)) {
			failedRecords.push({
				queueItemId: item.id,
				error: `Некорректная дата timestampIso: «${item.timestampIso}»`,
				status: "failed_error",
			});
			continue;
		}

		// Register ID and signature
		seenIds.add(item.id);
		if (item.paymentId) seenIds.add(item.paymentId);
		if (item.invoiceId) seenIds.add(item.invoiceId);
		seenSignatures.add(signature);

		validItemsToProcess.push({
			item,
			signature,
			timestampMs: itemTime,
		});
	}

	// Step 2: Chronological Sort
	validItemsToProcess.sort((a, b) => a.timestampMs - b.timestampMs);

	// Step 3: Shift Partitioning and Receipt Generation
	let currentShiftNumber = options.startingShiftNumber ?? 1;
	let currentFiscalDocNumber = options.startingFiscalDocNumber ?? 1001;
	const fnSerial = options.fnSerial ?? "9960440301849210";

	const batchShifts: BatchShiftContainer[] = [];
	const allProcessedReceipts: ProcessedFiscalReceiptRecord[] = [];

	if (validItemsToProcess.length > 0) {
		let shiftOpenedAtIso = validItemsToProcess[0]!.item.timestampIso;
		let shiftOpenedMs = validItemsToProcess[0]!.timestampMs;
		let shiftReceipts: ProcessedFiscalReceiptRecord[] = [];
		let receiptNumberInShift = 0;

		for (const { item, signature, timestampMs } of validItemsToProcess) {
			// Check if item exceeds 24-hour shift boundary
			if (timestampMs - shiftOpenedMs >= maxShiftDuration && shiftReceipts.length > 0) {
				// Close previous shift
				const shiftClosedAtIso = shiftReceipts[shiftReceipts.length - 1]!.issuedAtIso;
				const zReport = compileShiftZReport(
					currentShiftNumber,
					shiftOpenedAtIso,
					shiftClosedAtIso,
					shiftReceipts,
					currentFiscalDocNumber++,
					options,
				);

				batchShifts.push({
					shiftNumber: currentShiftNumber,
					openedAtIso: shiftOpenedAtIso,
					closedAtIso: shiftClosedAtIso,
					receipts: shiftReceipts,
					zReport,
				});

				// Open new shift
				currentShiftNumber += 1;
				shiftOpenedAtIso = item.timestampIso;
				shiftOpenedMs = timestampMs;
				shiftReceipts = [];
				receiptNumberInShift = 0;
			}

			// Process receipt
			receiptNumberInShift += 1;
			const fiscalDocNumber = currentFiscalDocNumber++;
			const fiscalSign = generateDeterministicFiscalSign(`receipt-${item.id}-${fiscalDocNumber}`);

			// Calculate exact totals from item lines and tenders
			let itemLinesGrossKop = 0;
			let itemLinesDiscountKop = 0;
			for (const it of item.items) {
				const priceKop = rubToKopecks(it.priceRub);
				const qty = it.quantity ?? 1;
				const discKop = it.discountRub ? rubToKopecks(it.discountRub) : 0;
				itemLinesGrossKop += priceKop * qty;
				itemLinesDiscountKop += discKop;
			}
			const totalNetKop = Math.max(0, itemLinesGrossKop - itemLinesDiscountKop);

			const cashKop = item.tenders.cashRub ? rubToKopecks(item.tenders.cashRub) : 0;
			const cardKop = item.tenders.cardRub ? rubToKopecks(item.tenders.cardRub) : 0;
			const sbpKop = item.tenders.sbpRub ? rubToKopecks(item.tenders.sbpRub) : 0;
			const advanceKop = item.tenders.advanceOffsetRub ? rubToKopecks(item.tenders.advanceOffsetRub) : 0;
			const creditKop = item.tenders.creditPostpaymentRub ? rubToKopecks(item.tenders.creditPostpaymentRub) : 0;
			const electronicTotalKop = cardKop + sbpKop;

			const totalReceiptKop = cashKop + electronicTotalKop + advanceKop + creditKop > 0
				? cashKop + electronicTotalKop + advanceKop + creditKop
				: totalNetKop;

			const totalRubFormatted = kopecksToNumericString(totalReceiptKop);

			const fnsQrString = buildFnsQrString({
				issuedAtIso: item.timestampIso,
				totalRubFormatted,
				fnSerial,
				fiscalDocNumber,
				fiscalSign,
				operationType: item.operationType,
			});

			const receiptRecord: ProcessedFiscalReceiptRecord = {
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				patientId: item.patientId,
				patientFullName: item.patientFullName,
				fiscalDocNumber,
				fiscalSign,
				shiftNumber: currentShiftNumber,
				receiptNumberInShift,
				issuedAtIso: item.timestampIso,
				operationType: item.operationType,
				totalRub: kopecksToRub(totalReceiptKop),
				totalKopecks: totalReceiptKop,
				cashRub: kopecksToRub(cashKop),
				cashKopecks: cashKop,
				cardRub: kopecksToRub(cardKop),
				cardKopecks: cardKop,
				sbpRub: kopecksToRub(sbpKop),
				sbpKopecks: sbpKop,
				electronicTotalRub: kopecksToRub(electronicTotalKop),
				electronicTotalKopecks: electronicTotalKop,
				advanceOffsetRub: kopecksToRub(advanceKop),
				advanceOffsetKopecks: advanceKop,
				creditPostpaymentRub: kopecksToRub(creditKop),
				creditPostpaymentKopecks: creditKop,
				fnsQrString,
				idempotencyKey: item.idempotencyKey ?? `${item.id}#${signature}`,
				payloadSignature: signature,
				status: "processed",
			};

			shiftReceipts.push(receiptRecord);
			allProcessedReceipts.push(receiptRecord);
		}

		// Close the final open shift
		if (shiftReceipts.length > 0) {
			const shiftClosedAtIso = shiftReceipts[shiftReceipts.length - 1]!.issuedAtIso;
			const zReport = compileShiftZReport(
				currentShiftNumber,
				shiftOpenedAtIso,
				shiftClosedAtIso,
				shiftReceipts,
				currentFiscalDocNumber++,
				options,
			);

			batchShifts.push({
				shiftNumber: currentShiftNumber,
				openedAtIso: shiftOpenedAtIso,
				closedAtIso: shiftClosedAtIso,
				receipts: shiftReceipts,
				zReport,
			});
		}
	}

	// Step 4: Overall Batch Aggregations
	let totalGrossKop = 0;
	let totalNetKop = 0;
	let totalCashKop = 0;
	let totalElectronicKop = 0;
	let totalAdvanceOffsetKop = 0;

	for (const r of allProcessedReceipts) {
		if (r.operationType === "income") {
			totalGrossKop += r.totalKopecks;
			totalNetKop += r.totalKopecks;
			totalCashKop += r.cashKopecks;
			totalElectronicKop += r.electronicTotalKopecks;
			totalAdvanceOffsetKop += r.advanceOffsetKopecks;
		} else if (r.operationType === "income_return") {
			totalNetKop -= r.totalKopecks;
			totalCashKop -= r.cashKopecks;
			totalElectronicKop -= r.electronicTotalKopecks;
			totalAdvanceOffsetKop -= r.advanceOffsetKopecks;
		}
	}

	// Step 5: Bank Reconciliation
	const reconciliation = reconcileWithBankingRegistry(allProcessedReceipts, options.bankRegistry);

	return {
		batchId,
		processedAtIso,
		totalItemsCount: queueItems.length,
		processedCount: allProcessedReceipts.length,
		duplicateCount: skippedDuplicates.length,
		failedCount: failedRecords.length,
		totalGrossKopecks: totalGrossKop,
		totalGrossRub: kopecksToRub(totalGrossKop),
		totalNetKopecks: totalNetKop,
		totalNetRub: kopecksToRub(totalNetKop),
		totalCashKopecks: totalCashKop,
		totalCashRub: kopecksToRub(totalCashKop),
		totalElectronicKopecks: totalElectronicKop,
		totalElectronicRub: kopecksToRub(totalElectronicKop),
		totalAdvanceOffsetKopecks: totalAdvanceOffsetKop,
		totalAdvanceOffsetRub: kopecksToRub(totalAdvanceOffsetKop),
		shifts: batchShifts,
		processedReceipts: allProcessedReceipts,
		skippedDuplicates,
		failedRecords,
		reconciliation,
	};
}
