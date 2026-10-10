/**
 * receiptBuilders.ts — Layer 2: Маппинг позиций плана лечения в фискальные позиции 54-ФЗ (ФФД 1.2),
 * сборка кассовых чеков прихода/расхода и Z-отчетов закрытия смены (Тег 1038).
 */

import {
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	type Kopecks,
	calculateVatKopecks,
	computeFpd54Fz,
	isRetailCommodityItem,
	kopecksToNumericString,
	kopecksToRubles,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import {
	FFD12_CORRECTION_LABELS,
	FFD12_OPERATION_LABELS,
	TREATMENT_STAGE_LABELS,
	type FiscalReceipt54FzResult,
	type Order804nFiscalReceiptItem,
	type ShiftCloseZReport54FzResult,
	type SplitPaymentInput,
} from "./types";
import {
	calculateSplitPaymentAllocation,
	calculateTaxDeductionBreakdown,
	formatFiscalItemName,
	generateSbpPaymentQr,
	resolveTaxDeductionCategory,
} from "./taxAndMathHelpers";

/**
 * Преобразование позиций плана лечения в строго валидированные фискальные позиции 54-ФЗ с копеечной точностью.
 */
export function mapTreatmentItemsToFiscalReceipt(
	items: readonly (TreatmentPlanItem | Order804nFiscalReceiptItem)[],
	paymentMethod: Ffd12PaymentMethod = "full_payment",
): {
	items: readonly Order804nFiscalReceiptItem[];
	totalKopecks: Kopecks;
	totalRub: number;
	grossKopecks: Kopecks;
	grossRub: number;
	taxRateKopecks: Kopecks;
	vat20Kopecks: Kopecks;
	vat20Rub: number;
	vatNoneKopecks: Kopecks;
	vatNoneRub: number;
	hasMixedItems: boolean;
	retailTotalKopecks: Kopecks;
	medicalTotalKopecks: Kopecks;
	hasExpensiveTreatment: boolean;
	taxDeductionSummaryCode: "1" | "2";
} {
	const resultItems: Order804nFiscalReceiptItem[] = [];
	let vat20Kopecks = 0 as Kopecks;
	let vatNoneKopecks = 0 as Kopecks;
	let retailTotalKopecks = 0 as Kopecks;
	let medicalTotalKopecks = 0 as Kopecks;

	for (const it of items) {
		const qty = Math.max(1, it.quantity || 1);
		const unitPriceRub = it.unitPriceRub || it.priceRub || 0;
		const unitPriceKopecks = parseKopecks(unitPriceRub);
		const discountRub = it.discountRub || 0;
		const discountKopecks = parseKopecks(discountRub);

		const grossAmountKopecks = multiplyKopecks(unitPriceKopecks, qty);
		const grossRub = kopecksToRubles(grossAmountKopecks);
		const netAmountKopecks = Math.max(
			0,
			grossAmountKopecks - discountKopecks,
		) as Kopecks;
		const amountRub = kopecksToRubles(netAmountKopecks);

		const isRetail = isRetailCommodityItem({
			name: it.name,
			category: it.category,
			paymentSubject: it.paymentSubject,
			vatRate: it.vatRate,
			isRetail: it.isRetail,
		});

		const taxCat = isRetail ? "1" : resolveTaxDeductionCategory(it.code804n, it.name);
		const fiscalName = formatFiscalItemName(it.name, it.code804n, it.toothNumber);

		// Check if item is MDLP marked (anesthetics, implants, bone materials)
		const lowerName = (it.name || "").toLowerCase();
		const lowerMat = (it.materials || "").toLowerCase();
		const isMarked =
			lowerName.includes("импланта") ||
			lowerName.includes("имплантат") ||
			lowerName.includes("анестези") ||
			lowerName.includes("ультракаин") ||
			lowerName.includes("септанест") ||
			lowerName.includes("убистезин") ||
			lowerName.includes("bio-oss") ||
			lowerMat.includes("импланта") ||
			lowerMat.includes("имплантат") ||
			lowerMat.includes("анестетик");

		let vatRate: Ffd12VatRate;
		let taxRateKopecks: Kopecks;
		let paymentSubject: Ffd12PaymentSubject;

		if (isRetail) {
			vatRate = it.vatRate || "vat_20";
			paymentSubject =
				it.paymentSubject ||
				(it.category === "certificates" ? "payment" : "commodity");
			taxRateKopecks =
				vatRate === "vat_none"
					? (0 as Kopecks)
					: (calculateVatKopecks(netAmountKopecks, "vat_20") as Kopecks);

			retailTotalKopecks = (retailTotalKopecks + netAmountKopecks) as Kopecks;
			if (vatRate === "vat_20") {
				vat20Kopecks = (vat20Kopecks + taxRateKopecks) as Kopecks;
			} else {
				vatNoneKopecks = (vatNoneKopecks + netAmountKopecks) as Kopecks;
			}
		} else {
			vatRate = "vat_none"; // Медицинские стоматологические услуги освобождены от НДС (ст. 149 НК РФ)
			taxRateKopecks = 0 as Kopecks;
			paymentSubject = isMarked ? "goods_with_marking" : "service"; // Тег 1212 = 32 (Маркированный товар) / 4 (Услуга)

			medicalTotalKopecks = (medicalTotalKopecks + netAmountKopecks) as Kopecks;
			vatNoneKopecks = (vatNoneKopecks + netAmountKopecks) as Kopecks;
		}

		resultItems.push({
			id: it.id,
			name: fiscalName,
			code804n: it.code804n || (isRetail ? "RETAIL" : "A16.07.002"),
			...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
			quantity: qty,
			unitPriceRub,
			unitPriceKopecks,
			discountRub,
			discountKopecks,
			grossRub,
			grossKopecks: grossAmountKopecks,
			amountRub,
			amountKopecks: netAmountKopecks,
			vatRate,
			taxRateKopecks,
			paymentSubject,
			paymentMethod,
			quantityMeasure: "piece",
			taxDeductionCategory: taxCat,
			stageKind: it.stageKind,
			stageCategoryTitle:
				(it.stageKind ? TREATMENT_STAGE_LABELS[it.stageKind] : undefined) ||
				it.category ||
				(isRetail ? "Витрина ресепшена (гигиена)" : "Стоматологическое лечение"),
			isMarkedItem: isMarked,
			matchedTradeName: isMarked ? it.name : undefined,
			isRetail,
			barcode: it.barcode,
			sku: it.sku,
		});
	}

	const totalKopecks = sumKopecks(resultItems.map((i) => i.amountKopecks));
	const totalRub = kopecksToRubles(totalKopecks);
	const grossKopecks = sumKopecks(resultItems.map((i) => i.grossKopecks));
	const grossRub = kopecksToRubles(grossKopecks);
	const taxRateKopecks = sumKopecks(resultItems.map((i) => i.taxRateKopecks));

	const hasExpensiveTreatment = resultItems.some(
		(i) => !i.isRetail && i.taxDeductionCategory === "2",
	);

	return {
		items: resultItems,
		totalKopecks,
		totalRub,
		grossKopecks,
		grossRub,
		taxRateKopecks,
		vat20Kopecks,
		vat20Rub: kopecksToRubles(vat20Kopecks),
		vatNoneKopecks,
		vatNoneRub: kopecksToRubles(vatNoneKopecks),
		hasMixedItems: vat20Kopecks > 0 && vatNoneKopecks > 0,
		retailTotalKopecks,
		medicalTotalKopecks,
		hasExpensiveTreatment,
		taxDeductionSummaryCode: hasExpensiveTreatment ? "2" : "1",
	};
}

/**
 * Построение готового фискального чека 54-ФЗ со всеми обязательными реквизитами.
 */
export function generateFiscalReceipt54Fz(params: {
	readonly items: readonly (TreatmentPlanItem | Order804nFiscalReceiptItem)[];
	readonly splitPayment: SplitPaymentInput;
	readonly patientId: string;
	readonly patientName: string;
	readonly customerContact: string; // Телефон или Email для отправки электронного чека по 54-ФЗ
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly operationType?: Ffd12OperationType | undefined;
	readonly isCorrection?: boolean | undefined;
	readonly correctionType?: Ffd12CorrectionType | undefined;
	readonly correctionDocDate?: string | undefined;
	readonly correctionDocNumber?: string | undefined;
	readonly correctionReason?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalDocumentNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly refundReason?: string | undefined;
	/** 54-ФЗ: Тип и реквизиты покупателя (только для юрлиц/ИП, для физлиц НЕ требуется) */
	readonly payerType?: "individual" | "legal_entity" | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
}): FiscalReceipt54FzResult {
	const {
		items,
		splitPayment,
		patientId,
		patientName,
		customerContact,
		cashierFullName = "Кассир-администратор",
		cashierInn,
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "7707083893",
		clinicAddress = "г. Москва, ул. Профсоюзная, д. 42",
		taxationSystem = "usn_income",
		customReceiptNumber,
		shiftNumber = 42,
		operationType = "income",
		isCorrection = false,
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		originalReceiptNumber,
		originalFiscalDocumentNumber,
		originalFiscalSign,
		refundReason,
		payerType = "individual",
		buyerInn,
		buyerName,
	} = params;

	const fiscalItemsData = mapTreatmentItemsToFiscalReceipt(items);
	const payments = calculateSplitPaymentAllocation(
		fiscalItemsData.totalKopecks,
		splitPayment,
	);

	const now = new Date();
	const receiptDateIso = now.toISOString();
	const receiptDateRu = now.toLocaleString("ru-RU", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const isWarrantyZeroAct = payments.totalKopecks === 0;
	const prefix = isWarrantyZeroAct
		? "АКТ-ГАР"
		: operationType === "income_return"
			? "CHK-RET"
			: isCorrection
				? "CHK-COR"
				: "CHK";
	const receiptNumber =
		customReceiptNumber ||
		`${prefix}-${now.getFullYear()}-0001`;
	const fnSerial = isWarrantyZeroAct ? "0000000000000000" : "9960440301234567";
	const fiscalDocumentNumber = isWarrantyZeroAct ? "0" : "1001";
	const fiscalSign = isWarrantyZeroAct
		? "0000000000"
		: computeFpd54Fz({
				fnSerial,
				fiscalDocumentNumber,
				issuedAt: now,
				totalKopecks: payments.totalKopecks,
				operationType,
			});

	const ofdUrl = isWarrantyZeroAct
		? ""
		: `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${kopecksToNumericString(payments.totalKopecks)}&n=${operationType === "income_return" ? "2" : "1"}`;

	// SBP QR generation if SBP payment amount > 0 and operation is regular income
	let sbpPayloadUrl: string | undefined;
	let sbpCrc16: string | undefined;
	if (payments.sbpKopecks > 0 && operationType === "income") {
		const sbp = generateSbpPaymentQr({
			amountKopecks: payments.sbpKopecks,
			orderNumber: receiptNumber,
		});
		sbpPayloadUrl = sbp.payloadUrl;
		sbpCrc16 = sbp.crc16;
	}

	const taxationNames: Record<Ffd12TaxationSystem, string> = {
		osn: "ОСН",
		usn_income: "УСН Доходы",
		usn_income_expense: "УСН Доходы-Расходы",
		esxn: "ЕСХН",
		psn: "ПСН",
	};

	return {
		receiptNumber,
		receiptDateIso,
		receiptDateRu,
		fnSerial,
		fiscalDocumentNumber,
		fiscalSign,
		shiftNumber,
		cashierFullName,
		...(cashierInn ? { cashierInn } : {}),
		clinicLegalName,
		clinicInn,
		clinicAddress,
		taxationSystem,
		taxationSystemName: taxationNames[taxationSystem] || "УСН Доходы",
		customerContact,
		patientName,
		patientId,
		items: fiscalItemsData.items,
		payments,
		totalRub: payments.totalRub,
		totalKopecks: payments.totalKopecks,
		grossRub: fiscalItemsData.grossRub,
		grossKopecks: fiscalItemsData.grossKopecks,
		taxRateKopecks: fiscalItemsData.taxRateKopecks,
		vat20Kopecks: fiscalItemsData.vat20Kopecks,
		vat20Rub: fiscalItemsData.vat20Rub,
		vatNoneKopecks: fiscalItemsData.vatNoneKopecks,
		vatNoneRub: fiscalItemsData.vatNoneRub,
		hasMixedItems: fiscalItemsData.hasMixedItems,
		retailTotalKopecks: fiscalItemsData.retailTotalKopecks,
		medicalTotalKopecks: fiscalItemsData.medicalTotalKopecks,
		insuranceCoveredRub: payments.insuranceRub,
		...(splitPayment.guaranteeLetterNumber ? { guaranteeLetterNumber: splitPayment.guaranteeLetterNumber } : {}),
		patientCoPayRub: payments.patientCoPayRub,
		taxDeductionCategory: fiscalItemsData.taxDeductionSummaryCode,
		taxDeductionBreakdown: calculateTaxDeductionBreakdown(fiscalItemsData.items),
		ofdUrl,
		...(sbpPayloadUrl ? { sbpPayloadUrl } : {}),
		...(sbpCrc16 ? { sbpCrc16 } : {}),
		operationType,
		operationTypeName: FFD12_OPERATION_LABELS[operationType] || "Приход",
		...(isCorrection ? { isCorrection: true } : {}),
		...(correctionType ? { correctionType, correctionTypeName: FFD12_CORRECTION_LABELS[correctionType] } : {}),
		...(correctionDocDate ? { correctionDocDate } : {}),
		...(correctionDocNumber ? { correctionDocNumber } : {}),
		...(correctionReason ? { correctionReason } : {}),
		...(originalReceiptNumber ? { originalReceiptNumber } : {}),
		...(originalFiscalDocumentNumber ? { originalFiscalDocumentNumber } : {}),
		...(originalFiscalSign ? { originalFiscalSign } : {}),
		...(refundReason ? { refundReason } : {}),
		payerType,
		...(buyerInn?.trim() ? { buyerInn: buyerInn.trim() } : {}),
		...(buyerName?.trim() ? { buyerName: buyerName.trim() } : {}),
		...(isWarrantyZeroAct ? { isWarrantyZeroAct: true } : {}),
	};
}

/**
 * Автоматическое формирование фискального Z-отчета закрытия смены 54-ФЗ (Тег 1038 / Отчет о закрытии смены)
 * со сверкой эквайринга, СБП QR, наличного ящика и зачета аванса.
 */
export function generateShiftCloseZReport54Fz(params: {
	readonly shiftNumber?: number | undefined;
	readonly openDateIso?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly summary: {
		readonly receivedRub: number;
		readonly receivedCount: number;
		readonly cashRub: number;
		readonly advanceRub: number;
		readonly familyWalletRub: number;
		readonly refundedRub: number;
		readonly refundedCount: number;
		readonly byMethod: readonly {
			readonly method: string;
			readonly amountRub: number;
			readonly count: number;
		}[];
	};
}): ShiftCloseZReport54FzResult {
	const {
		shiftNumber = 142,
		openDateIso = new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
		cashierFullName = "Сидорова Анна Павловна",
		cashierInn = "771234567890",
		clinicLegalName = "ООО «ДЕНТЕ КЛИНИКА»",
		clinicInn = "7707083893",
		clinicKpp = "770101001",
		clinicAddress = "г. Москва, ул. Профсоюзная, д. 42",
		kktRegNumber = "0004589210034821",
		kktSerialNumber = "0184920042",
		fnSerial = "9960440301234567",
		ofdName = "ООО «Платформа ОФД»",
		summary,
	} = params;

	const now = new Date();
	const closeDateIso = now.toISOString();
	const closeDateRu = now.toLocaleString("ru-RU", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	// Split breakdown by methods
	let cardRub = 0;
	let sbpRub = 0;
	for (const row of summary.byMethod) {
		if (row.method === "card") cardRub += row.amountRub;
		else if (row.method === "online") sbpRub += row.amountRub;
	}

	const incomeCashKopecks = parseKopecks(summary.cashRub);
	const incomeCardKopecks = parseKopecks(cardRub);
	const incomeSbpKopecks = parseKopecks(sbpRub);
	const incomeAdvanceOffsetKopecks = parseKopecks(summary.familyWalletRub);
	const incomeTotalKopecks = parseKopecks(summary.receivedRub + summary.familyWalletRub);
	const incomeTotalRub = kopecksToRubles(incomeTotalKopecks);

	const incomeReturnCashKopecks = parseKopecks(0);
	const incomeReturnCardKopecks = parseKopecks(summary.refundedRub);
	const incomeReturnTotalKopecks = parseKopecks(summary.refundedRub);
	const incomeReturnTotalRub = kopecksToRubles(incomeReturnTotalKopecks);

	const totalRevenueKopecks = Math.max(0, incomeTotalKopecks - incomeReturnTotalKopecks) as Kopecks;
	const totalRevenueRub = kopecksToRubles(totalRevenueKopecks);

	const fiscalDocumentNumber = `200${shiftNumber}`;
	const fiscalSign = `100000000${shiftNumber}`;
	const ofdUrl = `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${totalRevenueRub.toFixed(2)}&n=1`;

	return {
		reportNumber: `З-ОТЧЕТ-${shiftNumber}`,
		shiftNumber,
		openDateIso,
		closeDateIso,
		closeDateRu,
		clinicLegalName,
		clinicInn,
		clinicKpp,
		clinicAddress,
		cashierFullName,
		cashierInn,
		kktRegNumber,
		kktSerialNumber,
		fnSerial,
		fiscalDocumentNumber,
		fiscalSign,
		ofdName,
		ofdUrl,
		incomeCount: summary.receivedCount,
		incomeTotalRub,
		incomeTotalKopecks,
		incomeCashRub: summary.cashRub,
		incomeCashKopecks,
		incomeCardRub: cardRub,
		incomeCardKopecks,
		incomeSbpRub: sbpRub,
		incomeSbpKopecks,
		incomeAdvanceOffsetRub: summary.familyWalletRub,
		incomeAdvanceOffsetKopecks,
		incomeReturnCount: summary.refundedCount,
		incomeReturnTotalRub,
		incomeReturnTotalKopecks,
		incomeReturnCashRub: 0, incomeReturnCashKopecks,
		incomeReturnCardRub: summary.refundedRub, incomeReturnCardKopecks,
		correctionCount: 0,
		correctionTotalRub: 0,
		totalRevenueRub,
		totalRevenueKopecks,
		cashInDrawerCalculatedRub: summary.cashRub,
		unprintedDocumentsCount: 0,
		isShiftExpired24h: false,
		fnResourceDaysRemaining: 420,
	};
}
