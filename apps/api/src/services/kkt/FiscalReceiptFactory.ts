/**
 * Production-Grade 54-FZ Fiscal Receipt Factory (FFD 1.2 / ФФД 1.2).
 * Formats, validates, and builds compliant fiscal receipts with full lifecycle:
 * - Advance / Prepayment (признак 1..3: advance, full_prepayment, prepayment)
 * - Advance Offset / Final Settlement (признак 4: full_payment, advance_offset)
 * - Split payments (Cash + Electronic/Card + SBP + Advance Offset) with kopeck-exact arithmetic
 * - Tag mappings: 1054, 1212, 1214, 1081, 1031, 1215, 1199 (Без НДС ст. 149 НК РФ), 2108, 1055
 * - Tag 2000 / Tag 1162 / Tag 1163: DataMatrix GS1 / Честный ЗНАК / МДЛП Marking Codes
 */

import { z } from "zod";
import {
	buildFfd12Tag2000MarkingPayload,
	type CreateFiscalReceiptPayloadInput,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	type FiscalReceiptItemInput,
	kopecksToNumericString,
	parseChestnyZnakDataMatrix,
} from "@dental/shared";

export interface Ffd12ItemPayload {
	name: string;
	priceKopecks: number;
	quantity: number;
	amountKopecks: number;
	tag1030_subjectName: string;
	tag1079_unitPriceRub: string;
	tag1023_quantity: number;
	tag1043_amountRub: string;
	tag1212_paymentSubject: number;
	tag1214_paymentMethod: number;
	tag1199_vatRate: number;
	tag2108_quantityMeasure: number;
	medicalServiceCodeMzk?: string | null | undefined;
	markingCode?: string | null | undefined;
	tag2000_markingPayload?: {
		readonly tag1163_markingCode: string;
		readonly tag2106_checkResult: number;
		readonly tag2107_productStatus: number;
		readonly gtin: string;
		readonly serialNumber: string;
	} | null | undefined;
}

export interface Ffd12ReceiptPayload {
	tag1054_operationType: number;
	tag1055_taxationSystem: number;
	tag1009_paymentAddress?: string | undefined;
	tag1187_paymentPlace?: string | undefined;
	tag1021_cashierName: string;
	tag1203_cashierInn?: string | null | undefined;
	tag1008_customerContact: string;
	tag1020_totalRub: string;
	totalKopecks: number;
	payments: {
		tag1031_cashRub: string;
		cashKopecks: number;
		tag1081_electronicRub: string;
		electronicCardKopecks: number;
		sbpKopecks: number;
		tag1215_prepaidAdvanceOffsetRub: string;
		prepaidKopecks: number;
	};
	items: Ffd12ItemPayload[];
	taxDeductionCategory: "1" | "2";
}

export interface KktExecutionResult {
	success: boolean;
	fnSerial: string;
	fiscalDocumentNumber: string;
	fiscalSign: string;
	receiptIssuedAt: string;
	ofdVerificationUrl: string;
	queueStatus: "printed" | "hardware_offline";
	errorMessage?: string | undefined;
}

export class FiscalReceiptFactory {
	/**
	 * Tag 1054: Operation type (1=Income, 2=Income Return, 3=Expense, 4=Expense Return)
	 */
	public static resolveTag1054(operationType: Ffd12OperationType): number {
		switch (operationType) {
			case "income":
				return 1;
			case "income_return":
				return 2;
			case "expense":
				return 3;
			case "expense_return":
				return 4;
			default:
				return 1;
		}
	}

	/**
	 * Tag 1212: Payment Subject (1=Commodity, 3=Job, 4=Service, 10=Payment/Advance, 32=Marked Goods)
	 */
	public static resolveTag1212(subject: Ffd12PaymentSubject): number {
		switch (subject) {
			case "commodity":
				return 1;
			case "job":
				return 3;
			case "service":
				return 4;
			case "payment":
				return 10;
			case "goods_with_marking":
				return 32;
			case "goods_without_marking":
				return 33;
			default:
				return 4;
		}
	}

	/**
	 * Tag 1214: Payment Method:
	 * 1 = Full Prepayment (Предоплата 100%)
	 * 2 = Partial Prepayment (Предоплата)
	 * 3 = Advance (Аванс)
	 * 4 = Full Payment / Final Settlement (Полный расчет / Зачет аванса)
	 * 5 = Partial Payment & Credit (Частичный расчет и кредит)
	 * 6 = Credit Handover (Передача в кредит)
	 * 7 = Credit Payment (Оплата кредита)
	 */
	public static resolveTag1214(method: Ffd12PaymentMethod): number {
		switch (method) {
			case "full_prepayment":
				return 1;
			case "prepayment":
				return 2;
			case "advance":
				return 3;
			case "full_payment":
				return 4;
			case "partial_payment_and_credit":
				return 5;
			case "credit_handover":
				return 6;
			case "credit_payment":
				return 7;
			default:
				return 4;
		}
	}

	/**
	 * Tag 1199: VAT rate:
	 * 1 = 20%, 2 = 10%, 3 = 20/120, 4 = 10/110, 5 = 0%, 6 = Без НДС (Art. 149 Tax Code RF)
	 */
	public static resolveTag1199(vatRate: Ffd12VatRate): number {
		switch (vatRate) {
			case "vat_20":
				return 1;
			case "vat_10":
				return 2;
			case "vat_20_120":
				return 3;
			case "vat_10_110":
				return 4;
			case "vat_0":
				return 5;
			case "vat_none":
			default:
				return 6; // Без НДС для медицинских услуг
		}
	}

	/**
	 * Tag 2108: Quantity measure (0 = piece / unit)
	 */
	public static resolveTag2108(measure: Ffd12QuantityMeasure): number {
		switch (measure) {
			case "piece":
				return 0;
			case "gram":
				return 10;
			case "kilogram":
				return 11;
			case "other":
			default:
				return 0;
		}
	}

	/**
	 * Tag 1055: Taxation system (1=OSN, 2=USN Income, 4=USN Income-Expense, 8=ESXN, 16=PSN)
	 */
	public static resolveTag1055(taxation: Ffd12TaxationSystem): number {
		switch (taxation) {
			case "osn":
				return 1;
			case "usn_income":
				return 2;
			case "usn_income_expense":
				return 4;
			case "esxn":
				return 8;
			case "psn":
				return 16;
			default:
				return 2;
		}
	}

	/**
	 * Constructs structured FFD 1.2 compliant receipt payload.
	 */
	public static buildFfd12Receipt(input: CreateFiscalReceiptPayloadInput): Ffd12ReceiptPayload {
		const items: Ffd12ItemPayload[] = input.items.map((item) => {
			const tag1212 = this.resolveTag1212(item.subject);
			const tag1214 = this.resolveTag1214(item.method);
			const tag1199 = this.resolveTag1199(item.vatRate);
			const tag2108 = this.resolveTag2108(item.measure);

			let markingPayload: Ffd12ItemPayload["tag2000_markingPayload"] = null;
			if (item.markingCode && item.markingCode.trim().length > 0) {
				const parsed = parseChestnyZnakDataMatrix(item.markingCode);
				if (parsed.isValid && parsed.gtin && parsed.serialNumber) {
					markingPayload = buildFfd12Tag2000MarkingPayload({
						rawDataMatrix: item.markingCode,
						gtin: parsed.gtin,
						serialNumber: parsed.serialNumber,
						cryptoKey: parsed.cryptoKey,
						cryptoTail: parsed.cryptoTail,
					});
				}
			}

			return {
				name: item.name,
				priceKopecks: item.priceKopecks,
				quantity: item.quantity,
				amountKopecks: item.amountKopecks,
				tag1030_subjectName: item.name,
				tag1079_unitPriceRub: kopecksToNumericString(item.priceKopecks),
				tag1023_quantity: item.quantity,
				tag1043_amountRub: kopecksToNumericString(item.amountKopecks),
				tag1212_paymentSubject: tag1212,
				tag1214_paymentMethod: tag1214,
				tag1199_vatRate: tag1199,
				tag2108_quantityMeasure: tag2108,
				medicalServiceCodeMzk: item.medicalServiceCode804n ?? null,
				markingCode: item.markingCode ?? null,
				tag2000_markingPayload: markingPayload,
			};
		});

		const cashKopecks = input.cashKopecks ?? 0;
		const electronicCardKopecks = input.electronicCardKopecks ?? 0;
		const sbpKopecks = input.sbpKopecks ?? 0;
		const prepaidKopecks = input.prepaidKopecks ?? 0;
		const totalElectronicKopecks = electronicCardKopecks + sbpKopecks;

		return {
			tag1054_operationType: this.resolveTag1054(input.operationType),
			tag1055_taxationSystem: this.resolveTag1055(input.taxationSystem),
			tag1021_cashierName: input.cashierFullName,
			tag1203_cashierInn: input.cashierInn ?? null,
			tag1008_customerContact: input.customerContact,
			tag1020_totalRub: kopecksToNumericString(input.totalKopecks),
			totalKopecks: input.totalKopecks,
			payments: {
				tag1031_cashRub: kopecksToNumericString(cashKopecks),
				cashKopecks,
				tag1081_electronicRub: kopecksToNumericString(totalElectronicKopecks),
				electronicCardKopecks,
				sbpKopecks,
				tag1215_prepaidAdvanceOffsetRub: kopecksToNumericString(prepaidKopecks),
				prepaidKopecks,
			},
			items,
			taxDeductionCategory: input.taxDeductionSummaryCode === "code_2_expensive_treatment" ? "2" : "1",
		};
	}


	/**
	 * Builds OFD verification URL for patient check lookup.
	 */
	public static buildOfdUrl(params: {
		fn: string;
		fd: string;
		fpd: string;
		amountKopecks: number;
		operationType: string;
	}): string {
		const n = params.operationType === "income_return" ? "2" : "1";
		const sumRub = kopecksToNumericString(params.amountKopecks);
		return `https://ofd.ru/check?fn=${encodeURIComponent(params.fn)}&fd=${encodeURIComponent(params.fd)}&fpd=${encodeURIComponent(params.fpd)}&s=${sumRub}&n=${n}`;
	}
}
