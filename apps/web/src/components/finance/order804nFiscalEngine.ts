/**
 * order804nFiscalEngine.ts — Движок фискализации услуг Номенклатуры 804н по 54-ФЗ (ФФД 1.2),
 * раздельной оплаты (наличные, банковские карты, СБП QR, депозит) и копеечной математики.
 */

import {
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
} from "@dental/shared";
import type { TreatmentPlanItem } from "../treatment-plans/types";

export interface Order804nFiscalReceiptItem {
	readonly id: string;
	readonly name: string;
	readonly code804n: string;
	readonly toothNumber?: number;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: Kopecks;
	readonly discountRub: number;
	readonly discountKopecks: Kopecks;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly vatRate: Ffd12VatRate;
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
	readonly cashierInn?: string;
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
	readonly insuranceCoveredRub?: number;
	readonly guaranteeLetterNumber?: string;
	readonly patientCoPayRub?: number;
	readonly taxDeductionCategory: "1" | "2";
	readonly ofdUrl: string;
	readonly sbpPayloadUrl?: string;
	readonly sbpCrc16?: string;
}

/**
 * Определение кода налогового вычета по Номенклатуре 804н (Код 01 против Кода 02).
 * Код 02 (Дорогостоящее лечение): дентальная имплантация (A16.07.054.001), костная пластика (A16.07.041),
 * сложные хирургические реконструкции.
 */
export function resolveTaxDeductionCategory(code804n: string): "1" | "2" {
	const expensiveCodes = ["A16.07.054.001", "A16.07.041", "A16.07.054"];
	return expensiveCodes.includes(code804n) ? "2" : "1";
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

/**
 * Преобразование позиций плана лечения в строго валидированные фискальные позиции 54-ФЗ.
 */
export function mapTreatmentItemsToFiscalReceipt(
	items: readonly TreatmentPlanItem[],
	paymentMethod: Ffd12PaymentMethod = "full_payment",
): {
	items: readonly Order804nFiscalReceiptItem[];
	totalKopecks: Kopecks;
	totalRub: number;
	hasExpensiveTreatment: boolean;
	taxDeductionSummaryCode: "1" | "2";
} {
	const resultItems: Order804nFiscalReceiptItem[] = [];

	for (const it of items) {
		const qty = Math.max(1, it.quantity || 1);
		const unitPriceRub = it.unitPriceRub;
		const unitPriceKopecks = parseKopecks(unitPriceRub);
		const discountRub = it.discountRub || 0;
		const discountKopecks = parseKopecks(discountRub);

		const grossAmountKopecks = multiplyKopecks(unitPriceKopecks, qty);
		const netAmountKopecks = Math.max(
			0,
			grossAmountKopecks - discountKopecks,
		) as Kopecks;
		const amountRub = Math.round(netAmountKopecks / 100);

		const taxCat = resolveTaxDeductionCategory(it.code804n);
		const fiscalName = formatFiscalItemName(it.name, it.code804n, it.toothNumber);

		// Check if item is MDLP marked (anesthetics, implants, bone materials)
		const lowerName = (it.name || "").toLowerCase();
		const lowerMat = (it.materials || "").toLowerCase();
		const isMarked =
			lowerName.includes("имплантат") ||
			lowerName.includes("анестези") ||
			lowerName.includes("ультракаин") ||
			lowerName.includes("септанест") ||
			lowerName.includes("убистезин") ||
			lowerName.includes("bio-oss") ||
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
			amountRub,
			amountKopecks: netAmountKopecks,
			vatRate: "vat_none", // Медицинские стоматологические услуги освобождены от НДС (ст. 149 НК РФ)
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
	const totalRub = Math.round(totalKopecks / 100);
	const hasExpensiveTreatment = resultItems.some(
		(i) => i.taxDeductionCategory === "2",
	);

	return {
		items: resultItems,
		totalKopecks,
		totalRub,
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

	const receivedCashRub = input.receivedCashRub !== undefined ? Math.max(0, input.receivedCashRub) : Math.round(cashKopecks / 100);
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
	const advanceOffsetRub = Math.round(depositKopecks / 100);

	return {
		cashRub: Math.round(cashKopecks / 100),
		cashKopecks,
		receivedCashRub,
		receivedCashKopecks,
		changeRub: Math.round(changeKopecks / 100),
		changeKopecks,
		isCashShortage,
		cashShortageRub: Math.round(cashShortageKopecks / 100),
		cardRub: Math.round(cardKopecks / 100),
		cardKopecks,
		sbpRub: Math.round(sbpKopecks / 100),
		sbpKopecks,
		depositRub: Math.round(depositKopecks / 100),
		depositKopecks,
		advanceOffsetRub,
		advanceOffsetKopecks,
		familyWalletRub: Math.round(familyWalletKopecks / 100),
		familyWalletKopecks,
		certificateRub: Math.round(certificateKopecks / 100),
		certificateKopecks,
		insuranceRub: Math.round(insuranceKopecks / 100),
		insuranceKopecks,
		patientCoPayRub: Math.round(patientCoPayKopecks / 100),
		patientCoPayKopecks,
		totalRub: Math.round(totalKopecks / 100),
		totalKopecks,
		allocatedKopecks,
		remainingKopecks,
		isFullyAllocated: allocatedKopecks === totalKopecks,
		isOverallocated: allocatedKopecks > totalKopecks,
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
	readonly cashierFullName?: string;
	readonly cashierInn?: string;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicAddress?: string;
	readonly taxationSystem?: Ffd12TaxationSystem;
	readonly customReceiptNumber?: string;
	readonly shiftNumber?: number;
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

	const receiptNumber =
		customReceiptNumber ||
		`CHK-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
	const fnSerial = "9960440301234567";
	const fiscalDocumentNumber = String(Math.floor(1000 + Math.random() * 9000));
	const fiscalSign = String(Math.floor(1000000000 + Math.random() * 9000000000));

	const ofdUrl = `https://ofd.ru/check?fn=${fnSerial}&fd=${fiscalDocumentNumber}&fpd=${fiscalSign}&s=${payments.totalRub}.00&n=1`;

	// SBP QR generation if SBP payment amount > 0
	let sbpPayloadUrl: string | undefined;
	let sbpCrc16: string | undefined;
	if (payments.sbpKopecks > 0) {
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
		insuranceCoveredRub: payments.insuranceRub,
		...(splitPayment.guaranteeLetterNumber ? { guaranteeLetterNumber: splitPayment.guaranteeLetterNumber } : {}),
		patientCoPayRub: payments.patientCoPayRub,
		taxDeductionCategory: fiscalItemsData.taxDeductionSummaryCode,
		ofdUrl,
		...(sbpPayloadUrl ? { sbpPayloadUrl } : {}),
		...(sbpCrc16 ? { sbpCrc16 } : {}),
	};
}
