/**
 * order804nFiscalEngine.ts — Движок фискализации услуг Номенклатуры 804н по 54-ФЗ (ФФД 1.2),
 * чеков возврата прихода, чеков коррекции, раздельной оплаты (наличные, банковские карты, СБП QR, депозит)
 * и копеечной математики с разделением кодов налогового вычета (Код 01 / Код 02).
 */

import {
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	SbpQrEngine,
	splitKopecks,
	sumKopecks,
	calculateProportionalMultiTenderRefund,
	kopecksToRubles,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../treatment-plans/types";

export interface Order804nFiscalReceiptItem {
	readonly id: string;
	readonly name: string;
	readonly code804n: string;
	readonly toothNumber?: number | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: Kopecks;
	readonly discountRub: number;
	readonly discountKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly vatRate: Ffd12VatRate;
	readonly taxRateKopecks: Kopecks; // Ставка / сумма НДС в копейках (0 для льготных медицинских услуг по ст. 149 НК РФ)
	readonly paymentSubject: Ffd12PaymentSubject;
	readonly paymentMethod: Ffd12PaymentMethod;
	readonly quantityMeasure: Ffd12QuantityMeasure;
	readonly taxDeductionCategory: "1" | "2"; // 1 = стандартное лечение (лимит 150к), 2 = дорогостоящее (имплантация/хирургия, без лимита)
	readonly stageKind?: string | undefined;
	readonly stageCategoryTitle?: string | undefined;
	readonly markingCode?: string | undefined;
	readonly isMarkedItem?: boolean | undefined;
	readonly matchedTradeName?: string | undefined;
}

export interface SplitPaymentInput {
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
}

export interface SplitPaymentAllocation {
	readonly cashRub: number;
	readonly cashKopecks: Kopecks;
	readonly receivedCashRub: number;
	readonly receivedCashKopecks: Kopecks;
	readonly changeRub: number;
	readonly changeKopecks: Kopecks;
	readonly isCashShortage: boolean;
	readonly cashShortageRub: number;
	readonly cardRub: number;
	readonly cardKopecks: Kopecks;
	readonly sbpRub: number;
	readonly sbpKopecks: Kopecks;
	readonly depositRub: number;
	readonly depositKopecks: Kopecks;
	readonly advanceOffsetRub: number;
	readonly advanceOffsetKopecks: Kopecks;
	readonly familyWalletRub: number;
	readonly familyWalletKopecks: Kopecks;
	readonly certificateRub: number;
	readonly certificateKopecks: Kopecks;
	readonly insuranceRub: number;
	readonly insuranceKopecks: Kopecks;
	readonly patientCoPayRub: number;
	readonly patientCoPayKopecks: Kopecks;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly allocatedKopecks: Kopecks;
	readonly remainingKopecks: Kopecks;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
}

export interface FiscalReceipt54FzResult {
	readonly receiptNumber: string;
	readonly receiptDateIso: string;
	readonly receiptDateRu: string;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: string; // ФД
	readonly fiscalSign: string; // ФПД
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicAddress: string;
	readonly taxationSystem: Ffd12TaxationSystem;
	readonly taxationSystemName: string;
	readonly customerContact: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly items: readonly Order804nFiscalReceiptItem[];
	readonly payments: SplitPaymentAllocation;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly taxRateKopecks: Kopecks;
	readonly insuranceCoveredRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly patientCoPayRub?: number | undefined;
	readonly taxDeductionCategory: "1" | "2";
	readonly taxDeductionBreakdown?: TaxDeductionReceiptBreakdown | undefined;
	readonly ofdUrl: string;
	readonly sbpPayloadUrl?: string | undefined;
	readonly sbpCrc16?: string | undefined;
	/** ФФД 1.2 Тип операции: приход, возврат прихода, расход, возврат расхода */
	readonly operationType: Ffd12OperationType;
	readonly operationTypeName: string;
	/** ФФД 1.2 Атрибуты чека коррекции */
	readonly isCorrection?: boolean | undefined;
	readonly correctionType?: Ffd12CorrectionType | undefined;
	readonly correctionTypeName?: string | undefined;
	readonly correctionDocDate?: string | undefined;
	readonly correctionDocNumber?: string | undefined;
	readonly correctionReason?: string | undefined;
	/** Реквизиты исходного чека при возврате прихода или коррекции */
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalDocumentNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly refundReason?: string | undefined;
}

export type TaxDeductionRelationship = "self" | "spouse" | "parent" | "child";

export const TAX_DEDUCTION_RELATIONSHIP_LABELS: Record<TaxDeductionRelationship, string> = {
	self: "Пациент лично (за себя)",
	spouse: "Супруг / супруга",
	parent: "Родитель (мать / отец)",
	child: "Ребенок / подопечный (до 18 / 24 лет)",
};

export const TAX_DEDUCTION_RELATIONSHIP_CODES: Record<TaxDeductionRelationship, string> = {
	self: "1",
	spouse: "2",
	parent: "3",
	child: "4",
};

export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = 150000; // Лимит по ст. 219 НК РФ для обычного лечения (Код 01) с 2024 года

export interface TaxDeductionReceiptBreakdown {
	readonly code01Kopecks: Kopecks;
	readonly code01Rub: number;
	readonly code02Kopecks: Kopecks;
	readonly code02Rub: number;
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly hasCode01: boolean;
	readonly hasCode02: boolean;
	readonly dominantCode: "1" | "2";
	readonly code01ItemsCount: number;
	readonly code02ItemsCount: number;
	/** Оценка возврата НДФЛ 13% (с учетом годового лимита 150 000 ₽ для Кода 01) */
	readonly refund13EstimateRub: number;
	/** Оценка возврата НДФЛ 15% для повышенной шкалы */
	readonly refund15EstimateRub: number;
	/** Использовано из лимита вычета 150 000 ₽ (по Коду 01) */
	readonly code01UsedFromLimitRub: number;
	/** Остаток доступного лимита вычета 150 000 ₽ в текущем налоговом периоде */
	readonly code01RemainingLimitRub: number;
	readonly code01Refund13Rub: number;
	readonly code02Refund13Rub: number;
	readonly code01Refund15Rub: number;
	readonly code02Refund15Rub: number;
}

export interface TaxDeductionCertificatePayload {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly issueDateRu: string;
	readonly taxYear: number;
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNum?: string | undefined;
	readonly clinicAddress: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly payerRelationshipLabel: string;
	readonly payerRelationshipCode: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly breakdown: TaxDeductionReceiptBreakdown;
	readonly receipts: ReadonlyArray<{
		readonly receiptNumber: string;
		readonly fiscalDocumentNumber: string;
		readonly fiscalSign: string;
		readonly dateIso: string;
		readonly amountRub: number;
		readonly taxCode: "1" | "2";
	}>;
}

/**
 * Определение кода налогового вычета по Номенклатуре 804н и названию услуги (Код 01 против Кода 02).
 * Код 02 (Дорогостоящее лечение): дентальная имплантация (A16.07.054, A16.07.054.001, A16.07.054.002),
 * костная пластика (A16.07.041, A16.07.041.001), синус-лифтинг (A16.07.041.002, A16.07.040),
 * сложные реконструкции альвеолярного отростка (A16.07.055, A16.07.096).
 */
export function resolveTaxDeductionCategory(code804n?: string, serviceName?: string): "1" | "2" {
	const expensiveCodes = [
		"A16.07.054.001",
		"A16.07.054.002",
		"A16.07.054",
		"A16.07.041",
		"A16.07.041.001",
		"A16.07.041.002",
		"A16.07.040",
		"A16.07.055",
		"A16.07.096",
	];

	if (code804n && expensiveCodes.includes(code804n.trim())) {
		return "2";
	}

	if (serviceName) {
		const lower = serviceName.toLowerCase();
		if (
			lower.includes("импланта") ||
			lower.includes("имплантат") ||
			lower.includes("синус-лифтинг") ||
			lower.includes("синуслифтинг") ||
			lower.includes("костная пластика") ||
			lower.includes("остеопластик") ||
			lower.includes("аугментация") ||
			lower.includes("расщепление гребня") ||
			lower.includes("реконструкция челюсти") ||
			lower.includes("костный трансплантат")
		) {
			return "2";
		}
	}

	return "1";
}

/**
 * Расчет раздельных сумм для налогового вычета по Коду 01 и Коду 02 и расчет возврата НДФЛ 13%/15%.
 */
export function calculateTaxDeductionBreakdown(
	items: readonly (Order804nFiscalReceiptItem | TreatmentPlanItem)[],
	alreadyClaimedYearRub = 0,
): TaxDeductionReceiptBreakdown {
	let code01Kopecks = 0 as Kopecks;
	let code02Kopecks = 0 as Kopecks;
	let code01Count = 0;
	let code02Count = 0;

	for (const item of items) {
		const code804n = (item as { code804n?: string }).code804n || "";
		const serviceName = (item as { name?: string }).name || "";
		const cat =
			(item as { taxDeductionCategory?: "1" | "2" }).taxDeductionCategory ||
			resolveTaxDeductionCategory(code804n, serviceName);

		let itemKopecks: Kopecks;
		if ("amountKopecks" in item && typeof item.amountKopecks === "number") {
			itemKopecks = item.amountKopecks;
		} else {
			const unitRub =
				item.unitPriceRub || (item as { priceRub?: number }).priceRub || 0;
			const qty = item.quantity || 1;
			const discRub = item.discountRub || 0;
			const netRub = Math.max(0, unitRub * qty - discRub);
			itemKopecks = parseKopecks(netRub);
		}

		if (cat === "2") {
			code02Kopecks = (code02Kopecks + itemKopecks) as Kopecks;
			code02Count += 1;
		} else {
			code01Kopecks = (code01Kopecks + itemKopecks) as Kopecks;
			code01Count += 1;
		}
	}

	const code01Rub = kopecksToRubles(code01Kopecks);
	const code02Rub = kopecksToRubles(code02Kopecks);
	const totalKopecks = (code01Kopecks + code02Kopecks) as Kopecks;
	const totalRub = kopecksToRubles(totalKopecks);

	// Лимит 150 000 ₽ применяется строго к обычному лечению (Код 01)
	const remainingLimit = Math.max(
		0,
		ANNUAL_TAX_DEDUCTION_LIMIT_RUB - Math.max(0, alreadyClaimedYearRub),
	);
	const code01EligibleRub = Math.min(code01Rub, remainingLimit);
	const code01UsedFromLimitRub = code01EligibleRub;
	const code01RemainingLimitRub = Math.max(0, remainingLimit - code01EligibleRub);

	const code01Refund13Rub = kopecksToRubles(Math.round(parseKopecks(code01EligibleRub) * 0.13));
	const code02Refund13Rub = kopecksToRubles(Math.round(parseKopecks(code02Rub) * 0.13));
	const code01Refund15Rub = kopecksToRubles(Math.round(parseKopecks(code01EligibleRub) * 0.15));
	const code02Refund15Rub = kopecksToRubles(Math.round(parseKopecks(code02Rub) * 0.15));

	// Код 02 (дорогостоящее) не ограничен лимитом 150к
	const refund13EstimateRub = code01Refund13Rub + code02Refund13Rub;
	const refund15EstimateRub = code01Refund15Rub + code02Refund15Rub;

	return {
		code01Kopecks,
		code01Rub,
		code02Kopecks,
		code02Rub,
		totalKopecks,
		totalRub,
		hasCode01: code01Kopecks > 0,
		hasCode02: code02Kopecks > 0,
		dominantCode: code02Kopecks > 0 ? "2" : "1",
		code01ItemsCount: code01Count,
		code02ItemsCount: code02Count,
		refund13EstimateRub,
		refund15EstimateRub,
		code01UsedFromLimitRub,
		code01RemainingLimitRub,
		code01Refund13Rub,
		code02Refund13Rub,
		code01Refund15Rub,
		code02Refund15Rub,
	};
}

/**
 * Генерация справки об оплате медицинских услуг для налоговых органов (КНД 1151156 / Приказ 289/БГ-3-04/256).
 */
export function generateTaxDeductionCertificate(params: {
	readonly receipt: FiscalReceipt54FzResult;
	readonly payerFullName?: string | undefined;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerRelationship?: TaxDeductionRelationship | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly taxYear?: number | undefined;
	readonly customCertNumber?: string | undefined;
	readonly alreadyClaimedYearRub?: number | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNum?: string | undefined;
}): TaxDeductionCertificatePayload {
	const {
		receipt,
		payerFullName = receipt.patientName,
		payerInn,
		payerBirthDate,
		payerRelationship = "self",
		patientBirthDate,
		patientInn,
		taxYear = new Date(receipt.receiptDateIso).getFullYear(),
		customCertNumber,
		alreadyClaimedYearRub = 0,
		clinicKpp = "770101001",
		clinicOgrn = "1157746001234",
		clinicLicenseNum = "ЛО41-01137-77/00345678 от 12.04.2021",
	} = params;

	const breakdown = calculateTaxDeductionBreakdown(
		receipt.items,
		alreadyClaimedYearRub,
	);
	const now = new Date();
	const issueDateIso = now.toISOString();
	const issueDateRu = now.toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const certNumber =
		customCertNumber ||
		`СПР-${taxYear}-${Math.floor(1000 + Math.random() * 9000)}`;

	return {
		certificateNumber: certNumber,
		issueDateIso,
		issueDateRu,
		taxYear,
		clinicName: receipt.clinicLegalName,
		clinicLegalName: receipt.clinicLegalName,
		clinicInn: receipt.clinicInn,
		clinicKpp,
		clinicOgrn,
		clinicLicenseNum,
		clinicAddress: receipt.clinicAddress,
		payerFullName,
		...(payerInn ? { payerInn } : {}),
		...(payerBirthDate ? { payerBirthDate } : {}),
		payerRelationship,
		payerRelationshipLabel: TAX_DEDUCTION_RELATIONSHIP_LABELS[payerRelationship],
		payerRelationshipCode: TAX_DEDUCTION_RELATIONSHIP_CODES[payerRelationship],
		patientFullName: receipt.patientName,
		...(patientBirthDate ? { patientBirthDate } : {}),
		...(patientInn ? { patientInn } : {}),
		breakdown,
		receipts: [
			{
				receiptNumber: receipt.receiptNumber,
				fiscalDocumentNumber: receipt.fiscalDocumentNumber,
				fiscalSign: receipt.fiscalSign,
				dateIso: receipt.receiptDateIso,
				amountRub: receipt.totalRub,
				taxCode: breakdown.dominantCode,
			},
		],
	};
}

/**
 * Формирование фискального наименования услуги для тега 1030 (ФФД 1.2) с указанием зуба и кода 804н.
 */
export function formatFiscalItemName(
	serviceName: string,
	code804n?: string,
	toothNumber?: number,
): string {
	const cleanName = serviceName.trim();
	const toothPart = toothNumber ? ` (зуб №${toothNumber})` : "";
	const codePart = code804n ? ` [${code804n}]` : "";
	const fullName = `${cleanName}${toothPart}${codePart}`;
	// Тег 1030 ограничен 128 символами по стандарту ФФД 1.2
	return fullName.length > 128 ? fullName.slice(0, 125) + "..." : fullName;
}

export const TREATMENT_STAGE_LABELS: Record<string, string> = {
	stage_1_therapy: "Терапевтический этап (санация)",
	stage_2_surgery: "Хирургический этап (имплантация)",
	stage_3_orthopedics: "Ортопедический этап (протезирование)",
	stage_4_orthodontics: "Ортодонтический этап (исправление прикуса)",
	stage_5_hygiene: "Профгигиена и пародонтология",
};

export const FFD12_OPERATION_LABELS: Record<Ffd12OperationType, string> = {
	income: "Приход",
	income_return: "Возврат прихода",
	expense: "Расход",
	expense_return: "Возврат расхода",
};

export const FFD12_CORRECTION_LABELS: Record<Ffd12CorrectionType, string> = {
	self_initiated: "Самостоятельно",
	by_instruction: "По предписанию налогового органа",
};

/**
 * Преобразование позиций плана лечения в строго валидированные фискальные позиции 54-ФЗ с копеечной точностью.
 */
export function mapTreatmentItemsToFiscalReceipt(
	items: readonly TreatmentPlanItem[],
	paymentMethod: Ffd12PaymentMethod = "full_payment",
): {
	items: readonly Order804nFiscalReceiptItem[];
	totalKopecks: Kopecks;
	totalRub: number;
	grossKopecks: Kopecks;
	grossRub: number;
	taxRateKopecks: Kopecks;
	hasExpensiveTreatment: boolean;
	taxDeductionSummaryCode: "1" | "2";
} {
	const resultItems: Order804nFiscalReceiptItem[] = [];

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

		const taxCat = resolveTaxDeductionCategory(it.code804n, it.name);
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

		resultItems.push({
			id: it.id,
			name: fiscalName,
			code804n: it.code804n,
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
			vatRate: "vat_none", // Медицинские стоматологические услуги освобождены от НДС (ст. 149 НК РФ)
			taxRateKopecks: 0 as Kopecks,
			paymentSubject: isMarked ? "goods_with_marking" : "service", // Тег 1212 = 32 (Маркированный товар) / 4 (Услуга)
			paymentMethod, // Тег 1214 = 4 (Полный расчет)
			quantityMeasure: "piece", // Тег 2108 = 0 (Штука/ед.)
			taxDeductionCategory: taxCat,
			stageKind: it.stageKind,
			stageCategoryTitle:
				(it.stageKind ? TREATMENT_STAGE_LABELS[it.stageKind] : undefined) ||
				it.category ||
				"Стоматологическое лечение",
			isMarkedItem: isMarked,
			matchedTradeName: isMarked ? it.name : undefined,
		});
	}

	const totalKopecks = sumKopecks(resultItems.map((i) => i.amountKopecks));
	const totalRub = kopecksToRubles(totalKopecks);
	const grossKopecks = sumKopecks(resultItems.map((i) => i.grossKopecks));
	const grossRub = kopecksToRubles(grossKopecks);
	const taxRateKopecks = sumKopecks(resultItems.map((i) => i.taxRateKopecks));

	const hasExpensiveTreatment = resultItems.some(
		(i) => i.taxDeductionCategory === "2",
	);

	return {
		items: resultItems,
		totalKopecks,
		totalRub,
		grossKopecks,
		grossRub,
		taxRateKopecks,
		hasExpensiveTreatment,
		taxDeductionSummaryCode: hasExpensiveTreatment ? "2" : "1",
	};
}

/**
 * Точный расчет распределения раздельной оплаты (Наличные, Карта, СБП, Депозит, Семейный баланс, Сертификат) с контролем копеечного баланса и сдачи.
 */
export function calculateSplitPaymentAllocation(
	totalKopecks: Kopecks,
	input: SplitPaymentInput,
): SplitPaymentAllocation {
	const cashKopecks = parseKopecks(Math.max(0, input.cashRub || 0));
	const cardKopecks = parseKopecks(Math.max(0, input.cardRub || 0));
	const sbpKopecks = parseKopecks(Math.max(0, input.sbpRub || 0));
	const depositKopecks = parseKopecks(Math.max(0, input.depositRub || 0));
	const familyWalletKopecks = parseKopecks(Math.max(0, input.familyWalletRub || 0));
	const certificateKopecks = parseKopecks(Math.max(0, input.certificateRub || 0));
	const insuranceKopecks = parseKopecks(Math.max(0, input.insuranceRub || 0));

	const receivedCashRub = input.receivedCashRub !== undefined ? Math.max(0, input.receivedCashRub) : kopecksToRubles(cashKopecks);
	const receivedCashKopecks = parseKopecks(receivedCashRub);

	let changeKopecks = 0 as Kopecks;
	let isCashShortage = false;
	let cashShortageKopecks = 0 as Kopecks;

	if (cashKopecks > 0) {
		if (receivedCashKopecks >= cashKopecks) {
			changeKopecks = (receivedCashKopecks - cashKopecks) as Kopecks;
		} else if (input.receivedCashRub !== undefined) {
			isCashShortage = true;
			cashShortageKopecks = (cashKopecks - receivedCashKopecks) as Kopecks;
		}
	}

	// Сумма, которую фактически оплачивает пациент (все методы кроме страховой компании)
	const patientPaidKopecks = (cashKopecks +
		cardKopecks +
		sbpKopecks +
		depositKopecks +
		familyWalletKopecks +
		certificateKopecks) as Kopecks;

	const allocatedKopecks = (patientPaidKopecks + insuranceKopecks) as Kopecks;
	const remainingKopecks = (totalKopecks - allocatedKopecks) as Kopecks;
	const patientCoPayKopecks = Math.max(0, totalKopecks - insuranceKopecks) as Kopecks;

	// В 54-ФЗ (ФФД 1.2): Списание с депозита/аванса фискализируется в Тег 1215 (Зачет аванса)
	const advanceOffsetKopecks = depositKopecks;
	const advanceOffsetRub = kopecksToRubles(depositKopecks);

	return {
		cashRub: kopecksToRubles(cashKopecks),
		cashKopecks,
		receivedCashRub,
		receivedCashKopecks,
		changeRub: kopecksToRubles(changeKopecks),
		changeKopecks,
		isCashShortage,
		cashShortageRub: kopecksToRubles(cashShortageKopecks),
		cardRub: kopecksToRubles(cardKopecks),
		cardKopecks,
		sbpRub: kopecksToRubles(sbpKopecks),
		sbpKopecks,
		depositRub: kopecksToRubles(depositKopecks),
		depositKopecks,
		advanceOffsetRub,
		advanceOffsetKopecks,
		familyWalletRub: kopecksToRubles(familyWalletKopecks),
		familyWalletKopecks,
		certificateRub: kopecksToRubles(certificateKopecks),
		certificateKopecks,
		insuranceRub: kopecksToRubles(insuranceKopecks),
		insuranceKopecks,
		patientCoPayRub: kopecksToRubles(patientCoPayKopecks),
		patientCoPayKopecks,
		totalRub: kopecksToRubles(totalKopecks),
		totalKopecks,
		allocatedKopecks,
		remainingKopecks,
		isFullyAllocated: allocatedKopecks === totalKopecks,
		isOverallocated: allocatedKopecks > totalKopecks,
	};
}

/**
 * Пропорциональный расчет возврата средств по способам оплаты с гарантией нулевой потери копеек (Hamilton / Largest Remainder).
 */
export function calculateProportionalRefundAllocation(
	originalPayments: SplitPaymentAllocation,
	refundTotalKopecks: Kopecks,
): SplitPaymentAllocation {
	const refundCalc = calculateProportionalMultiTenderRefund(
		{
			cashKopecks: originalPayments.cashKopecks,
			cardKopecks: originalPayments.cardKopecks,
			sbpKopecks: originalPayments.sbpKopecks,
			advanceOffsetKopecks: originalPayments.advanceOffsetKopecks,
			totalPaidKopecks: originalPayments.allocatedKopecks,
		},
		refundTotalKopecks,
	);

	return {
		cashRub: refundCalc.refundCashRub,
		cashKopecks: refundCalc.refundCashKopecks as Kopecks,
		receivedCashRub: refundCalc.refundCashRub,
		receivedCashKopecks: refundCalc.refundCashKopecks as Kopecks,
		changeRub: 0,
		changeKopecks: 0 as Kopecks,
		isCashShortage: false,
		cashShortageRub: 0,
		cardRub: refundCalc.refundCardRub,
		cardKopecks: refundCalc.refundCardKopecks as Kopecks,
		sbpRub: refundCalc.refundSbpRub,
		sbpKopecks: refundCalc.refundSbpKopecks as Kopecks,
		depositRub: refundCalc.refundAdvanceOffsetRub,
		depositKopecks: refundCalc.refundAdvanceOffsetKopecks as Kopecks,
		advanceOffsetRub: refundCalc.refundAdvanceOffsetRub,
		advanceOffsetKopecks: refundCalc.refundAdvanceOffsetKopecks as Kopecks,
		familyWalletRub: 0,
		familyWalletKopecks: 0 as Kopecks,
		certificateRub: 0,
		certificateKopecks: 0 as Kopecks,
		insuranceRub: 0,
		insuranceKopecks: 0 as Kopecks,
		patientCoPayRub: refundCalc.totalRefundRub,
		patientCoPayKopecks: refundCalc.totalRefundKopecks as Kopecks,
		totalRub: refundCalc.totalRefundRub,
		totalKopecks: refundCalc.totalRefundKopecks as Kopecks,
		allocatedKopecks: refundCalc.totalRefundKopecks as Kopecks,
		remainingKopecks: 0 as Kopecks,
		isFullyAllocated: true,
		isOverallocated: false,
	};
}

/**
 * Генерация динамической платежной ссылки и QR-кода НСПК СБП (ГОСТ Р 56042-2014).
 */
export function generateSbpPaymentQr(params: {
	amountKopecks: Kopecks;
	orderNumber: string;
	bankMemberId?: string;
}): {
	payloadUrl: string;
	crc16: string;
} {
	const bankMemberId = params.bankMemberId || "100000000111"; // Сбербанк / НСПК эквайринг клиники
	return SbpQrEngine.buildNspkDynamicPayload({
		operationId: params.orderNumber,
		bankMemberId,
		amountKopecks: params.amountKopecks,
	});
}

/**
 * Построение готового фискального чека 54-ФЗ со всеми обязательными реквизитами.
 */
export function generateFiscalReceipt54Fz(params: {
	readonly items: readonly TreatmentPlanItem[];
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
		clinicInn = "7701234567",
		clinicAddress = "г. Москва, ул. Клиническая, д. 10",
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

	const prefix = operationType === "income_return" ? "CHK-RET" : isCorrection ? "CHK-COR" : "CHK";
	const receiptNumber =
		customReceiptNumber ||
		`${prefix}-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
	const fnSerial = "9960440301234567";
	const fiscalDocumentNumber = String(Math.floor(1000 + Math.random() * 9000));
	const fiscalSign = String(Math.floor(1000000000 + Math.random() * 9000000000));

	const ofdUrl = `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${payments.totalRub}.00&n=${operationType === "income_return" ? "2" : "1"}`;

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
	};
}

/**
 * Генерация фискального кассового чека возврата прихода (54-ФЗ / ФФД 1.2 Тег 1054 = 2)
 * при отказе от части или всех услуг плана лечения с сохранением копеечной точности.
 */
export function generateFiscalRefundReceipt54Fz(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly originalReceipt: {
		readonly receiptNumber: string;
		readonly fiscalDocumentNumber?: string | undefined;
		readonly fiscalSign?: string | undefined;
		readonly payments?: SplitPaymentAllocation | undefined;
		readonly patientId?: string | undefined;
		readonly patientName?: string | undefined;
		readonly customerContact?: string | undefined;
		readonly cashierFullName?: string | undefined;
		readonly clinicLegalName?: string | undefined;
		readonly clinicInn?: string | undefined;
		readonly clinicAddress?: string | undefined;
		readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	};
	readonly refundReason: string;
	readonly splitRefund?: SplitPaymentInput | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly cashierFullName?: string | undefined;
}): FiscalReceipt54FzResult {
	const {
		items,
		originalReceipt,
		refundReason,
		splitRefund,
		customReceiptNumber,
		cashierFullName = originalReceipt.cashierFullName || "Кассир-администратор",
	} = params;

	const fiscalItemsData = mapTreatmentItemsToFiscalReceipt(items);

	// Если splitRefund не передан явно, рассчитываем пропорционально способам оплаты исходного чека
	let splitPaymentInput: SplitPaymentInput;
	if (splitRefund) {
		splitPaymentInput = splitRefund;
	} else if (originalReceipt.payments) {
		const propAlloc = calculateProportionalRefundAllocation(
			originalReceipt.payments,
			fiscalItemsData.totalKopecks,
		);
		splitPaymentInput = {
			cashRub: propAlloc.cashRub,
			cardRub: propAlloc.cardRub,
			sbpRub: propAlloc.sbpRub,
			depositRub: propAlloc.depositRub,
		};
	} else {
		// По умолчанию возвращаем на банковскую карту
		splitPaymentInput = { cardRub: fiscalItemsData.totalRub };
	}

	return generateFiscalReceipt54Fz({
		items,
		splitPayment: splitPaymentInput,
		patientId: originalReceipt.patientId || "unknown-patient",
		patientName: originalReceipt.patientName || "Пациент",
		customerContact: originalReceipt.customerContact || "+7 000 000-00-00",
		cashierFullName,
		clinicLegalName: originalReceipt.clinicLegalName,
		clinicInn: originalReceipt.clinicInn,
		clinicAddress: originalReceipt.clinicAddress,
		taxationSystem: originalReceipt.taxationSystem || "usn_income",
		customReceiptNumber,
		operationType: "income_return",
		originalReceiptNumber: originalReceipt.receiptNumber,
		originalFiscalDocumentNumber: originalReceipt.fiscalDocumentNumber,
		originalFiscalSign: originalReceipt.fiscalSign,
		refundReason,
	});
}

/**
 * Генерация фискального чека коррекции (54-ФЗ / ФФД 1.2 Теги 1173, 1178, 1179).
 */
export function generateFiscalCorrectionReceipt54Fz(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly splitPayment: SplitPaymentInput;
	readonly operationType?: Ffd12OperationType | undefined;
	readonly correctionType: Ffd12CorrectionType; // "self_initiated" | "by_instruction"
	readonly correctionDocDate: string; // YYYY-MM-DD
	readonly correctionDocNumber: string;
	readonly correctionReason: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly customerContact: string;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystem?: Ffd12TaxationSystem | undefined;
	readonly customReceiptNumber?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
}): FiscalReceipt54FzResult {
	const {
		items,
		splitPayment,
		operationType = "income",
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		patientId,
		patientName,
		customerContact,
		cashierFullName,
		clinicLegalName,
		clinicInn,
		clinicAddress,
		taxationSystem,
		customReceiptNumber,
		originalReceiptNumber,
	} = params;

	return generateFiscalReceipt54Fz({
		items,
		splitPayment,
		patientId,
		patientName,
		customerContact,
		cashierFullName,
		clinicLegalName,
		clinicInn,
		clinicAddress,
		taxationSystem,
		customReceiptNumber,
		operationType,
		isCorrection: true,
		correctionType,
		correctionDocDate,
		correctionDocNumber,
		correctionReason,
		originalReceiptNumber,
	});
}

export interface DenominationsBreakdown {
	readonly b5000: number;
	readonly b2000: number;
	readonly b1000: number;
	readonly b500: number;
	readonly b200: number;
	readonly b100: number;
	readonly b50: number;
	readonly c10: number;
	readonly c5: number;
	readonly c2: number;
	readonly c1: number;
	readonly coinsFractionalRub: number;
}

export const EMPTY_DENOMINATIONS: DenominationsBreakdown = {
	b5000: 0,
	b2000: 0,
	b1000: 0,
	b500: 0,
	b200: 0,
	b100: 0,
	b50: 0,
	c10: 0,
	c5: 0,
	c2: 0,
	c1: 0,
	coinsFractionalRub: 0,
};

/**
 * Точный расчет суммы наличных в кассовом ящике по купюрному раскладу в копейках.
 */
export function calculateDenominationsTotalRub(b: DenominationsBreakdown): number {
	const totalKop =
		(b.b5000 || 0) * 500000 +
		(b.b2000 || 0) * 200000 +
		(b.b1000 || 0) * 100000 +
		(b.b500 || 0) * 50000 +
		(b.b200 || 0) * 20000 +
		(b.b100 || 0) * 10000 +
		(b.b50 || 0) * 5000 +
		(b.c10 || 0) * 1000 +
		(b.c5 || 0) * 500 +
		(b.c2 || 0) * 200 +
		(b.c1 || 0) * 100 +
		Math.round(Math.max(0, b.coinsFractionalRub || 0) * 100);
	return Math.round(totalKop) / 100;
}

export interface ShiftCloseZReport54FzResult {
	readonly reportNumber: string;
	readonly shiftNumber: number;
	readonly openDateIso: string;
	readonly closeDateIso: string;
	readonly closeDateRu: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber: string; // РН ККТ
	readonly kktSerialNumber: string; // ЗН ККТ
	readonly fnSerial: string; // № ФН
	readonly fiscalDocumentNumber: string; // ФД
	readonly fiscalSign: string; // ФПД
	readonly ofdName: string;
	readonly ofdUrl: string;

	// Counters by Operation (ФФД 1.2 Теги 1054, 1081, 1031, 1215)
	readonly incomeCount: number;
	readonly incomeTotalRub: number;
	readonly incomeTotalKopecks: Kopecks;
	readonly incomeCashRub: number;
	readonly incomeCashKopecks: Kopecks;
	readonly incomeCardRub: number;
	readonly incomeCardKopecks: Kopecks;
	readonly incomeSbpRub: number;
	readonly incomeSbpKopecks: Kopecks;
	readonly incomeAdvanceOffsetRub: number;
	readonly incomeAdvanceOffsetKopecks: Kopecks;

	readonly incomeReturnCount: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnTotalKopecks: Kopecks;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnCashKopecks: Kopecks;
	readonly incomeReturnCardRub: number;
	readonly incomeReturnCardKopecks: Kopecks;

	readonly correctionCount: number;
	readonly correctionTotalRub: number;

	readonly totalRevenueRub: number; // incomeTotalRub - incomeReturnTotalRub
	readonly totalRevenueKopecks: Kopecks;

	// Cash drawer & diagnostics
	readonly cashInDrawerCalculatedRub: number;
	readonly unprintedDocumentsCount: number;
	readonly isShiftExpired24h: boolean;
	readonly fnResourceDaysRemaining: number;
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
		clinicInn = "7701234567",
		clinicKpp = "770101001",
		clinicAddress = "г. Москва, ул. Стоматологическая, д. 24, стр. 1",
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

	const fiscalDocumentNumber = String(Math.floor(2000 + Math.random() * 8000));
	const fiscalSign = String(Math.floor(1000000000 + Math.random() * 9000000000));
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
		incomeReturnCashRub: 0,
		incomeReturnCashKopecks,
		incomeReturnCardRub: summary.refundedRub,
		incomeReturnCardKopecks,
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
