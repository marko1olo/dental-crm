/**
 * taxAndMathHelpers.ts — Layer 1: Математика копеек, НДС, налоговый вычет (Код 01 / 02),
 * справка КНД 1151156, СБП QR и купюрный расклад кассы по 54-ФЗ.
 */

import {
	type Ffd12PaymentSubject,
	type Ffd12VatRate,
	type Kopecks,
	parseKopecks,
	SbpQrEngine,
	kopecksToRubles,
	isRetailCommodityItem,
	resolveTaxDeductionCategoryShared,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	type DenominationsBreakdown,
	type FiscalReceipt54FzResult,
	type Order804nFiscalReceiptItem,
	type SplitPaymentAllocation,
	type SplitPaymentInput,
	type TaxDeductionCertificatePayload,
	type TaxDeductionReceiptBreakdown,
	type TaxDeductionRelationship,
	TAX_DEDUCTION_RELATIONSHIP_CODES,
	TAX_DEDUCTION_RELATIONSHIP_LABELS,
} from "./types";

/**
 * Определение кода налогового вычета по Номенклатуре 804н и названию услуги (Код 01 против Кода 02).
 * SSOT: Делегирует в каноническую реализацию resolveTaxDeductionCategoryShared из @dental/shared (Мандаты 8b, 8za),
 * поддерживающую полный перечень кодов Постановления Правительства РФ № 458.
 */
export function resolveTaxDeductionCategory(code804n?: string, serviceName?: string): "1" | "2" {
	return resolveTaxDeductionCategoryShared(code804n, serviceName);
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
		const isRetail = isRetailCommodityItem({
			name: (item as { name?: string }).name,
			category: (item as { category?: string }).category,
			paymentSubject: (item as { paymentSubject?: Ffd12PaymentSubject }).paymentSubject,
			vatRate: (item as { vatRate?: Ffd12VatRate }).vatRate,
			isRetail: (item as { isRetail?: boolean }).isRetail,
		});
		if (isRetail) {
			// Розничные товары стойки ресепшена и сертификаты исключаются из социального вычета на лечение (ст. 219 НК РФ)
			continue;
		}

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

	const code01Refund13Kopecks = Math.round((parseKopecks(code01EligibleRub) * 13) / 100);
	const code02Refund13Kopecks = Math.round((parseKopecks(code02Rub) * 13) / 100);
	const code01Refund15Kopecks = Math.round((parseKopecks(code01EligibleRub) * 15) / 100);
	const code02Refund15Kopecks = Math.round((parseKopecks(code02Rub) * 15) / 100);

	const code01Refund13Rub = kopecksToRubles(code01Refund13Kopecks);
	const code02Refund13Rub = kopecksToRubles(code02Refund13Kopecks);
	const code01Refund15Rub = kopecksToRubles(code01Refund15Kopecks);
	const code02Refund15Rub = kopecksToRubles(code02Refund15Kopecks);

	// Код 02 (дорогостоящее) не ограничен лимитом 150к
	const refund13EstimateRub = kopecksToRubles(code01Refund13Kopecks + code02Refund13Kopecks);
	const refund15EstimateRub = kopecksToRubles(code01Refund15Kopecks + code02Refund15Kopecks);

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
		`СПР-${taxYear}-001`;

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

	// В 54-ФЗ (ФФД 1.2): Списание с депозита/аванса фискализируется в Тег 1215 (Зачет аванса).
	// Подарочные сертификаты и семейный баланс также являются зачетом аванса (Тег 1215), внесенного при их покупке/пополнении.
	const advanceOffsetKopecks = (depositKopecks + familyWalletKopecks + certificateKopecks) as Kopecks;
	const advanceOffsetRub = kopecksToRubles(advanceOffsetKopecks);

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
