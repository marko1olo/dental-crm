/**
 * zReportAndDiscounts.ts — Layer 1: Z-Reports, Income Returns, Installment Plans, FNS QR & Loyalty Discounts.
 */

import {
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import type {
	DistributedDiscountResult,
	Ffd12ShiftCloseZReportSummary,
	Ffd12ShiftReceiptRecord,
	FiscalItemDraft,
	FiscalTapeWidth,
	FnsFiscalReceiptQrParams,
	IncomeReturnDraftResult,
	InstallmentPlanScheduleResult,
	InstallmentStageItem,
	LoyaltyDiscountParams,
	ReceptionQuickContactParams,
	SplitTenderState,
	ZReportPrintTapeParams,
} from "./types";
import {
	compile54FzFiscalTags,
	compileFiscalDraftSummary,
} from "./mathAndTender";

/**
 * Compiles a daily Z-report (Shift Close / Отчет о закрытии смены) according to 54-FZ FFD 1.2
 * with exact integer kopeck aggregation across cash (Tag 1031), electronic (Tag 1081),
 * advance offsets (Tag 1215), and returns (Tag 1054=2).
 */
export function compile54FzShiftCloseZReport(
	receipts: readonly Ffd12ShiftReceiptRecord[],
	shiftNumber: number = 1,
): Ffd12ShiftCloseZReportSummary {
	let incomeCount = 0;
	let incomeCashKop = 0;
	let incomeElectronicKop = 0;
	let incomeAdvanceKop = 0;

	let incomeReturnCount = 0;
	let incomeReturnCashKop = 0;
	let incomeReturnElectronicKop = 0;
	let incomeReturnAdvanceKop = 0;

	for (const r of receipts) {
		const tags = compile54FzFiscalTags(r.tenders);

		if (r.operationType === "income") {
			incomeCount += 1;
			incomeCashKop += tags.tag1031CashKopecks;
			incomeElectronicKop += tags.tag1081ElectronicKopecks;
			incomeAdvanceKop += tags.tag1215PrepaidKopecks;
		} else if (r.operationType === "income_return") {
			incomeReturnCount += 1;
			incomeReturnCashKop += tags.tag1031CashKopecks;
			incomeReturnElectronicKop += tags.tag1081ElectronicKopecks;
			incomeReturnAdvanceKop += tags.tag1215PrepaidKopecks;
		}
	}

	const incomeTotalKopecks = incomeCashKop + incomeElectronicKop + incomeAdvanceKop;
	const incomeReturnTotalKopecks = incomeReturnCashKop + incomeReturnElectronicKop + incomeReturnAdvanceKop;

	const netRevenueKopecks = Math.max(0, incomeTotalKopecks - incomeReturnTotalKopecks);
	const cashInDrawerKopecks = Math.max(0, incomeCashKop - incomeReturnCashKop);

	return {
		shiftNumber,
		closedAtIso: new Date().toISOString(),
		totalOperationsCount: receipts.length,
		incomeCount,
		incomeTotalRub: kopecksToRub(incomeTotalKopecks),
		incomeTotalKopecks,
		incomeCashRub: kopecksToRub(incomeCashKop),
		incomeCashKopecks: incomeCashKop,
		incomeElectronicRub: kopecksToRub(incomeElectronicKop),
		incomeElectronicKopecks: incomeElectronicKop,
		incomeAdvanceOffsetRub: kopecksToRub(incomeAdvanceKop),
		incomeAdvanceOffsetKopecks: incomeAdvanceKop,

		incomeReturnCount,
		incomeReturnTotalRub: kopecksToRub(incomeReturnTotalKopecks),
		incomeReturnTotalKopecks,
		incomeReturnCashRub: kopecksToRub(incomeReturnCashKop),
		incomeReturnCashKopecks: incomeReturnCashKop,
		incomeReturnElectronicRub: kopecksToRub(incomeReturnElectronicKop),
		incomeReturnElectronicKopecks: incomeReturnElectronicKop,
		incomeReturnAdvanceOffsetRub: kopecksToRub(incomeReturnAdvanceKop),
		incomeReturnAdvanceOffsetKopecks: incomeReturnAdvanceKop,

		netRevenueRub: kopecksToRub(netRevenueKopecks),
		netRevenueKopecks,
		cashInDrawerRub: kopecksToRub(cashInDrawerKopecks),
		cashInDrawerKopecks,
		isBalanced: (incomeTotalKopecks - incomeReturnTotalKopecks) === netRevenueKopecks,
	};
}

/**
 * Calculates 54-FZ Income Return (Возврат прихода, Tag 1054=2) with automatic reversal/restoration
 * of used patient deposit/family balance (Tag 1215) and card refund (Tag 1081).
 */
export function calculateIncomeReturnDraft(params: {
	readonly returnedItems: readonly FiscalItemDraft[];
	readonly originalTenders: SplitTenderState;
	readonly originalTotalKopecks?: number | undefined;
}): IncomeReturnDraftResult {
	const returnedSummary = compileFiscalDraftSummary(params.returnedItems, {
		cashRub: 0,
		cardRub: 0,
		sbpRub: 0,
		advanceOffsetRub: 0,
		familyWalletRub: 0,
		certificateRub: 0,
	});

	const returnTotalKop = returnedSummary.totalKopecks;
	const origTags = compile54FzFiscalTags(params.originalTenders);
	const origTotalKop = origTags.totalTenderKopecks > 0 ? origTags.totalTenderKopecks : returnTotalKop;

	const isPartialRefund = returnTotalKop < origTotalKop;
	const ratio = origTotalKop > 0 ? returnTotalKop / origTotalKop : 1;

	// Exact kopecks distribution based on return amount ratio
	let refundCashKop = Math.min(returnTotalKop, Math.round(origTags.tag1031CashKopecks * ratio));
	let refundCardKop = Math.min(returnTotalKop - refundCashKop, Math.round(rubToKopecks(params.originalTenders.cardRub) * ratio));
	let refundSbpKop = Math.min(returnTotalKop - refundCashKop - refundCardKop, Math.round(rubToKopecks(params.originalTenders.sbpRub) * ratio));
	let restoredDepositKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop, Math.round(rubToKopecks(params.originalTenders.advanceOffsetRub) * ratio));
	let restoredFamilyKop = Math.min(returnTotalKop - refundCashKop - refundCardKop - refundSbpKop - restoredDepositKop, Math.round(rubToKopecks(params.originalTenders.familyWalletRub || 0) * ratio));

	// Rebalance remaining kopeck rounding error to card or cash
	const sumAllocated = refundCashKop + refundCardKop + refundSbpKop + restoredDepositKop + restoredFamilyKop;
	const diffKop = returnTotalKop - sumAllocated;
	if (diffKop !== 0) {
		if (origTags.tag1081ElectronicKopecks > 0) {
			refundCardKop += diffKop;
		} else {
			refundCashKop += diffKop;
		}
	}

	const returnTenders: SplitTenderState = {
		cashRub: kopecksToRub(refundCashKop),
		cardRub: kopecksToRub(refundCardKop),
		sbpRub: kopecksToRub(refundSbpKop),
		advanceOffsetRub: kopecksToRub(restoredDepositKop),
		familyWalletRub: kopecksToRub(restoredFamilyKop),
		certificateRub: 0,
	};

	const fiscalTags = compile54FzFiscalTags(returnTenders, returnTotalKop);

	return {
		operationType: "income_return",
		totalReturnKopecks: returnTotalKop,
		totalReturnRub: kopecksToRub(returnTotalKop),
		restoredDepositKopecks: restoredDepositKop,
		restoredDepositRub: kopecksToRub(restoredDepositKop),
		restoredFamilyWalletKopecks: restoredFamilyKop,
		restoredFamilyWalletRub: kopecksToRub(restoredFamilyKop),
		refundToCardKopecks: refundCardKop,
		refundToCardRub: kopecksToRub(refundCardKop),
		refundToCashKopecks: refundCashKop,
		refundToCashRub: kopecksToRub(refundCashKop),
		refundToSbpKopecks: refundSbpKop,
		refundToSbpRub: kopecksToRub(refundSbpKop),
		returnTenders,
		fiscalTags,
		isPartialRefund,
	};
}

/**
 * Calculates a zero-interest clinic installment schedule (Беспроцентная рассрочка клиники 0%)
 * with exact integer kopecks arithmetic, down payment calculation (Tag 1214=2 / prepayment),
 * and equal monthly milestones with automatic remainder penny balancing.
 */
export function calculateInstallmentPlanSchedule(params: {
	readonly totalRub: number;
	readonly downPaymentPercent?: number | undefined; // Default: 30%
	readonly monthsCount?: number | undefined; // Default: 3 months
	readonly startDateIso?: string | undefined; // Default: today
	readonly planTitle?: string | undefined;
}): InstallmentPlanScheduleResult {
	const totalKopecks = rubToKopecks(params.totalRub);
	const downPaymentPercent = params.downPaymentPercent ?? 30;
	const monthsCount = Math.max(1, params.monthsCount ?? 3);
	const startDate = params.startDateIso ? new Date(params.startDateIso) : new Date();

	// Calculate down payment exact kopecks
	const downPaymentKopecks = Math.min(
		totalKopecks,
		Math.round((totalKopecks * downPaymentPercent) / 100),
	);
	const remainingDebtKopecks = Math.max(0, totalKopecks - downPaymentKopecks);

	// Calculate equal monthly payments in integer kopecks with penny balancing on last month
	const baseMonthlyKop = Math.floor(remainingDebtKopecks / monthsCount);
	const stages: InstallmentStageItem[] = [];

	// Initial down payment (Today / Stage 0)
	stages.push({
		stageIndex: 0,
		title: params.planTitle
			? `Первый взнос (${downPaymentPercent}%): ${params.planTitle}`
			: `Первый взнос по рассрочке (${downPaymentPercent}%)`,
		dueDateIso: startDate.toISOString(),
		dueDateRu: startDate.toLocaleDateString("ru-RU"),
		amountRub: kopecksToRub(downPaymentKopecks),
		amountKopecks: downPaymentKopecks,
		paymentMethod: "prepayment", // 54-FZ Tag 1214 = 2 (Предоплата)
		isInitialDownPayment: true,
		status: "pending",
	});

	let allocatedDebtKop = 0;
	for (let i = 1; i <= monthsCount; i++) {
		const monthDueDate = new Date(startDate);
		monthDueDate.setMonth(startDate.getMonth() + i);

		// Last month absorbs remainder penny to guarantee exact sum
		const isLastMonth = i === monthsCount;
		const stageKop = isLastMonth
			? remainingDebtKopecks - allocatedDebtKop
			: baseMonthlyKop;

		allocatedDebtKop += stageKop;

		stages.push({
			stageIndex: i,
			title: `Платеж ${i}/${monthsCount} по рассрочке`,
			dueDateIso: monthDueDate.toISOString(),
			dueDateRu: monthDueDate.toLocaleDateString("ru-RU"),
			amountRub: kopecksToRub(stageKop),
			amountKopecks: stageKop,
			paymentMethod: isLastMonth ? "full_payment" : "prepayment", // Финальный платеж закрывает полный расчет
			isInitialDownPayment: false,
			status: "scheduled",
		});
	}

	const sumAllStagesKop = stages.reduce((acc, s) => acc + s.amountKopecks, 0);

	return {
		totalPlanRub: kopecksToRub(totalKopecks),
		totalPlanKopecks: totalKopecks,
		downPaymentPercent,
		downPaymentRub: kopecksToRub(downPaymentKopecks),
		downPaymentKopecks,
		remainingDebtRub: kopecksToRub(remainingDebtKopecks),
		remainingDebtKopecks,
		monthsCount,
		monthlyPaymentRub: kopecksToRub(baseMonthlyKop),
		monthlyPaymentKopecks: baseMonthlyKop,
		stages,
		isBalanced: sumAllStagesKop === totalKopecks,
	};
}

/**
 * 54-FZ FFD 1.2: Compiles the official FNS QR verification string for instant validation in nalog.gov.ru:
 * `t=YYYYMMDDTHHMM&s=TOTAL_RUB.KOP&fn=FN_SERIAL&i=FD_NUM&fp=FPD_SIGN&n=OPERATION_TYPE`
 */
export function buildFnsFiscalReceiptQrString(params: FnsFiscalReceiptQrParams): string {
	const dateObj = params.issuedAtIso ? new Date(params.issuedAtIso) : new Date();
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const t = `${year}${month}${day}T${hours}${minutes}`;
	const s = params.totalRubFormatted;
	const fn = params.fnSerial;
	const i = params.fiscalDocNumber;
	const fp = params.fiscalSign;
	const n = params.operationType === "income_return" ? "2" : "1";

	return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}

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
	const closeDateRu = dateObj.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}) + " " + dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const lines: string[] = [
		divider,
		padCenter("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ", maxCols),
		padCenter("(Z-ОТЧЕТ 54-ФЗ / ФФД 1.2)", maxCols),
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

/**
 * Distributes discount across multiple receipt items with exact integer kopeck precision (Largest Remainder Method).
 * Eliminates penny rounding errors so that: sum(item.effectivePrice * item.quantity) === totalNet EXACTLY.
 * Seamlessly integrates StomX warranty reworks: warranty items receive 100% discount, zeroing out net price,
 * while loyalty presets apply proportionally across the remaining non-warranty positions.
 */
export function distributeLoyaltyDiscountAcrossItems<T extends {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly warrantySourceAppointmentId?: string | number | null | undefined;
}>(
	items: readonly T[],
	params: LoyaltyDiscountParams,
): DistributedDiscountResult<T> {
	if (items.length === 0) {
		return {
			items: [],
			totalGrossKopecks: 0,
			totalGrossRub: 0,
			totalDiscountKopecks: 0,
			totalDiscountRub: 0,
			totalNetKopecks: 0,
			totalNetRub: 0,
			effectivePercent: 0,
			savingsText: "Экономия для пациента: 0,00 ₽",
			isCapped: false,
			hasWarrantyRework: false,
			warrantyItemsCount: 0,
			totalWarrantyPriceRub: 0,
		};
	}

	// 1. Calculate Gross Kopecks per item and classify warranty rework positions
	let totalGrossKopecks = 0;
	let nonWarrantyGrossKopecks = 0;
	let warrantyKopecks = 0;
	let warrantyItemsCount = 0;
	const itemGrossKopecksList: number[] = [];

	for (const item of items) {
		const qty = Math.max(1, Math.round(item.quantity || 1));
		const unitGrossKop = Math.max(0, rubToKopecks(item.priceRub));
		const lineGrossKop = unitGrossKop * qty;
		itemGrossKopecksList.push(lineGrossKop);
		totalGrossKopecks += lineGrossKop;

		if (item.isWarranty) {
			warrantyKopecks += lineGrossKop;
			warrantyItemsCount++;
		} else {
			nonWarrantyGrossKopecks += lineGrossKop;
		}
	}

	const hasWarranty = warrantyItemsCount > 0;
	const totalWarrantyPriceRub = kopecksToRub(warrantyKopecks);

	if (totalGrossKopecks <= 0) {
		const resetItems = items.map((it) => ({
			...it,
			discountRub: 0,
		}));
		return {
			items: resetItems,
			totalGrossKopecks,
			totalGrossRub: 0,
			totalDiscountKopecks: 0,
			totalDiscountRub: 0,
			totalNetKopecks: 0,
			totalNetRub: 0,
			effectivePercent: 0,
			savingsText: "Экономия для пациента: 0,00 ₽",
			isCapped: false,
			hasWarrantyRework: false,
			warrantyItemsCount: 0,
			totalWarrantyPriceRub: 0,
		};
	}

	// 2. Determine target discount on non-warranty items in kopecks
	let targetLoyaltyDiscountKopecks = 0;
	let isCapped = false;

	if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		// All non-warranty items also receive 100% discount
		targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
	} else if (params.preset === "round_hundreds") {
		if (nonWarrantyGrossKopecks >= 10000) {
			const roundedKopecks = Math.floor(nonWarrantyGrossKopecks / 10000) * 10000;
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks - roundedKopecks;
		} else if (nonWarrantyGrossKopecks > 0) {
			const roundedKopecks = Math.floor(nonWarrantyGrossKopecks / 100) * 100;
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks - roundedKopecks;
		}
	} else if (params.preset === "discount_3") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 3) / 100);
	} else if (params.preset === "discount_5") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 5) / 100);
	} else if (params.preset === "discount_10" || params.preset === "pensioner_10") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 10) / 100);
	} else if (params.preset === "family_5") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 5) / 100);
	} else if (params.preset === "employee_20") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 20) / 100);
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * pct) / 100);
	} else if (params.preset === "manual_rub") {
		const requestedKop = Math.max(0, rubToKopecks(params.customRub ?? 0));
		if (requestedKop > nonWarrantyGrossKopecks) {
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
			isCapped = true;
		} else {
			targetLoyaltyDiscountKopecks = requestedKop;
		}
	}

	// Hard boundary guard: [0, nonWarrantyGrossKopecks]
	if (targetLoyaltyDiscountKopecks > nonWarrantyGrossKopecks) {
		targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
		isCapped = true;
	} else if (targetLoyaltyDiscountKopecks < 0) {
		targetLoyaltyDiscountKopecks = 0;
	}

	// 3. Proportional exact kopeck distribution across non-warranty items (Hamilton-Hare Largest Remainder Method)
	const itemLineDiscountKopecks: number[] = new Array(items.length).fill(0);
	let allocatedKopecks = 0;

	for (let i = 0; i < items.length; i++) {
		if (items[i]!.isWarranty) {
			// 100% warranty discount for rework
			itemLineDiscountKopecks[i] = itemGrossKopecksList[i]!;
		} else if (nonWarrantyGrossKopecks > 0 && targetLoyaltyDiscountKopecks > 0) {
			const lineGross = itemGrossKopecksList[i]!;
			const idealLineDiscountKop = (lineGross * targetLoyaltyDiscountKopecks) / nonWarrantyGrossKopecks;
			const baseLineDiscountKop = Math.floor(idealLineDiscountKop);
			itemLineDiscountKopecks[i] = baseLineDiscountKop;
			allocatedKopecks += baseLineDiscountKop;
		}
	}

	const remainderKopecks = targetLoyaltyDiscountKopecks - allocatedKopecks;

	if (remainderKopecks > 0 && nonWarrantyGrossKopecks > 0) {
		const nonWarrantyIndices: number[] = [];
		for (let i = 0; i < items.length; i++) {
			if (!items[i]!.isWarranty) nonWarrantyIndices.push(i);
		}

		const remainders = nonWarrantyIndices.map((i) => ({
			index: i,
			remainder: ((itemGrossKopecksList[i]! * targetLoyaltyDiscountKopecks) % nonWarrantyGrossKopecks) / nonWarrantyGrossKopecks,
			gross: itemGrossKopecksList[i]!,
		})).sort((a, b) => b.remainder - a.remainder || b.gross - a.gross);

		for (let r = 0; r < remainderKopecks && r < remainders.length; r++) {
			const idx = remainders[r]!.index;
			itemLineDiscountKopecks[idx]! += 1;
		}
	}

	// 4. Construct updated items
	const updatedItems: T[] = items.map((it, idx) => {
		const qty = Math.max(1, Math.round(it.quantity || 1));
		const lineDiscKop = itemLineDiscountKopecks[idx]!;
		const unitDiscRub = kopecksToRub(Math.round(lineDiscKop / qty));
		if (it.isWarranty) {
			return {
				...it,
				discountRub: it.priceRub * qty, // Full 100% warranty discount
				isWarranty: true,
				warrantyDiscountPercent: 100,
				warrantyPriceRub: kopecksToRub(itemGrossKopecksList[idx]!),
				warrantySourceAppointmentId: it.warrantySourceAppointmentId ?? null,
			};
		}
		return {
			...it,
			discountRub: unitDiscRub,
		};
	});

	const totalDiscountKopecks = warrantyKopecks + targetLoyaltyDiscountKopecks;
	const totalNetKopecks = Math.max(0, totalGrossKopecks - totalDiscountKopecks);
	const totalDiscountRub = kopecksToRub(totalDiscountKopecks);
	const effectivePercent = totalGrossKopecks > 0
		? Math.round((totalDiscountKopecks / totalGrossKopecks) * 1000) / 10
		: 0;

	const savingsFormatted = totalDiscountRub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	let savingsText = "";
	if (params.preset === "round_hundreds") {
		savingsText = `Округление до сотен: скидка ${savingsFormatted} ₽`;
	} else if (hasWarranty && totalDiscountRub > 0) {
		savingsText = `Гарантия и скидки: экономия ${savingsFormatted} ₽`;
	} else {
		savingsText = `Экономия для пациента: ${savingsFormatted} ₽`;
	}

	return {
		items: updatedItems,
		totalGrossKopecks,
		totalGrossRub: kopecksToRub(totalGrossKopecks),
		totalDiscountKopecks,
		totalDiscountRub,
		totalNetKopecks,
		totalNetRub: kopecksToRub(totalNetKopecks),
		effectivePercent,
		savingsText,
		isCapped,
		hasWarrantyRework: hasWarranty,
		warrantyItemsCount,
		totalWarrantyPriceRub,
	};
}

/**
 * Вычисляет скидку на копейки для округления вниз до сотен рублей.
 * Например, для 7 428 ₽ возвращает 28 ₽ (к оплате 7 400 ₽).
 */
export function calculateRoundToHundredsDiscountRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		const roundedKop = Math.floor(grossKop / 10000) * 10000;
		return kopecksToRub(grossKop - roundedKop);
	}
	const roundedKop = Math.floor(grossKop / 100) * 100;
	return kopecksToRub(grossKop - roundedKop);
}

/**
 * Округляет сумму до сотен рублей вниз (скидка на копейки).
 * Например, для 7 428 ₽ возвращает 7 400 ₽.
 */
export function roundToHundredsRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		return kopecksToRub(Math.floor(grossKop / 10000) * 10000);
	}
	return kopecksToRub(Math.floor(grossKop / 100) * 100);
}

export function buildReceptionQuickContactMessage(params: ReceptionQuickContactParams): {
	messageText: string;
	whatsAppLink: string;
	telLink: string;
} {
	const cleanPhone = (params.patientPhone || "").replace(/\D/g, "");
	const formattedPhone = cleanPhone.startsWith("8") && cleanPhone.length === 11
		? `7${cleanPhone.slice(1)}`
		: cleanPhone;

	const clinic = params.clinicName || "Стоматологическая клиника «ДЕНТЕ»";
	const time = params.appointmentTime ? `в ${params.appointmentTime}` : "сегодня";
	const doc = params.doctorName ? ` (врач: ${params.doctorName})` : "";
	const firstName = (params.patientName || "Уважаемый пациент").split(" ")[0] || "Здравствуйте";

	let messageText = "";

	switch (params.template) {
		case "reminder_visit":
			messageText = `Здравствуйте, ${firstName}! Напоминаем о вашем визите в ${clinic} ${time}${doc}. Если ваши планы изменились, пожалуйста, сообщите нам. Ждем вас!`;
			break;
		case "doctor_early":
			messageText = `Здравствуйте, ${firstName}! Доктор${doc} освободился чуть раньше запланированного времени. Если вам удобно, вы можете подойти пораньше. С уважением, ${clinic}.`;
			break;
		case "patient_running_late":
			messageText = `Здравствуйте, ${firstName}! Уточняем, всё ли у вас в порядке и успеваете ли вы к нам на приём ${time}${doc}? Мы вас ждем! С уважением, администратор ${clinic}.`;
			break;
		case "custom":
			messageText = params.customMessage || `Здравствуйте, ${firstName}! С уважением, ${clinic}.`;
			break;
	}

	const whatsAppLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
	const telLink = `tel:+${formattedPhone || cleanPhone}`;

	return {
		messageText,
		whatsAppLink,
		telLink,
	};
}
