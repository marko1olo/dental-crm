/**
 * DENTE Dental CRM — Statutory 54-FZ FFD 1.2 Fiscal Receipt & Split Engine (ФФД 1.2).
 *
 * Implements strict compliance with Federal Law 54-FZ and Order of FTS Russia ED-7-20/662@ (FFD 1.2):
 *
 * 1. Statutory Fiscal Tags:
 *    - Tag 1214 (Признак способа расчета):
 *      1 = Full Prepayment (Предоплата 100%)
 *      2 = Partial Prepayment (Частичная предоплата)
 *      3 = Advance (Аванс)
 *      4 = Full Settlement (Полный расчет / Окончательный расчет с зачетом аванса)
 *      5 = Partial Payment & Credit (Частичный расчет и кредит)
 *      6 = Credit Handover (Передача в кредит)
 *      7 = Credit Payment (Оплата кредита)
 *    - Tag 1212 (Признак предмета расчета):
 *      1 = Commodity (Товар — средства гигиены, пасты, щетки, воск)
 *      3 = Job (Работа — изготовление конструкций зуботехнической лабораторией)
 *      4 = Service (Медицинская стоматологическая услуга)
 *      10 = Payment / Advance (Платеж / Аванс / Взнос)
 *      11 = Agency Fee
 *      32 = Goods with Marking (Честный ЗНАК / МДЛП — анестетики, имплантаты, мембраны)
 *    - Tag 1055 (Применяемая система налогообложения — СНО):
 *      1 = OSN (Общая система налогообложения — ОСН)
 *      2 = USN Income (УСН Доходы)
 *      4 = USN Income-Expense (УСН Доходы минус Расходы)
 *      8 = ESXN (Единый сельскохозяйственный налог)
 *      16 = PSN (Патентная система налогообложения)
 *    - Tag 1030 (Наименование предмета расчета по Приказу Минздрава № 804н):
 *      Строгая номенклатурная валидация, маппинг медицинских услуг и кодов 804н.
 *    - Tag 1054 (Признак расчета):
 *      1 = Income (Приход)
 *      2 = Income Return (Возврат прихода)
 *      3 = Expense (Расход)
 *      4 = Expense Return (Возврат расхода)
 *    - Tag 1199 (Ставка НДС):
 *      6 = Without VAT (Без НДС — освобождение по пп. 2 п. 2 ст. 149 НК РФ для медуслуг)
 *      1 = VAT 20%, 2 = VAT 10%, 5 = VAT 0%
 *    - Tag 2108 (Мера количества предмета расчета):
 *      0 = piece (штука / единица), 10 = gram, 11 = kilogram, 255 = other
 *    - Tag 2000 / Tag 1162 / Tag 1163 (Код товара / Честный ЗНАК / МДЛП DataMatrix)
 *    - Payment Tenders (Теги видов оплат):
 *      Tag 1031 (Сумма наличными)
 *      Tag 1081 (Сумма электронными / картой / СБП / онлайн)
 *      Tag 1215 (Сумма предоплатой / зачетом ранее внесенного аванса)
 *      Tag 1216 (Сумма постоплатой / в кредит)
 *      Tag 1217 (Сумма встречным предоставлением)
 *
 * 2. Multi-Tender Split & Advance Offset Calculations:
 *    - Kopeck-exact balance arithmetic (no IEEE-754 floating point drift).
 *    - Dynamic conversion of Advance deposits (Tag 1214=3) into Final settlement (Tag 1214=4) with advance offset (Tag 1215).
 *    - Multi-payment splits: Cash + Card + SberPay QR + Advance Offset.
 *    - 54-FZ Correction receipt builder (Tag 1173, Tag 1178, Tag 1179).
 *    - 54-FZ Refund receipt builder (Tag 1054 = 2).
 *    - OFD verification URL and QR payload generator (t=...&s=...&fn=...&i=...&fp=...&n=...).
 */

import { Decimal } from "decimal.js";
import { z } from "zod";
import {
	type AnatomicalCanalCount,
	buildFfd12Tag2000MarkingPayload,
	calculateEndodonticCompositeTreatment,
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	type Ffd12CorrectionType,
	type Ffd12MarkingCodeDescriptor,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
	getAnatomicalRootCanalCount,
	getOrder804nEndoProcedureForTooth,
	isMultiRootedTooth,
	kopecksToNumericString,
	parseChestnyZnakDataMatrix,
} from "@dental/shared";

// High-precision decimal arithmetic configuration for monetary calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
};

export type Ffd12Tag1214Method = Ffd12PaymentMethod;
export type Ffd12Tag1212Subject = Ffd12PaymentSubject;
export type Ffd12Tag1055Taxation = Ffd12TaxationSystem;
export type Ffd12Tag1054Operation = Ffd12OperationType;
export type Ffd12Tag1199Vat = Ffd12VatRate;
export type Ffd12Tag2108Measure = Ffd12QuantityMeasure;
export type Ffd12Tag1173CorrectionType = Ffd12CorrectionType;

export interface FiscalReceiptPositionInput {
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly subject?: Ffd12Tag1212Subject | undefined;
	readonly method?: Ffd12Tag1214Method | undefined;
	readonly vatRate?: Ffd12Tag1199Vat | undefined;
	readonly measure?: Ffd12Tag2108Measure | undefined;
	readonly medicalServiceCode804n?: string | null | undefined;
	readonly toothFdiNumber?: number | null | undefined;
	readonly canalCount?: AnatomicalCanalCount | null | undefined;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
	readonly markingCode?: string | null | undefined;
}

export interface NormalizedFiscalPosition {
	readonly tag1030_subjectName: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly amountKopecks: number;
	readonly priceRub: number;
	readonly amountRub: number;
	readonly tag1079_unitPriceRub: string;
	readonly tag1043_amountRub: string;
	readonly tag1212_paymentSubject: number;
	readonly tag1214_paymentMethod: number;
	readonly tag1199_vatRate: number;
	readonly tag2108_quantityMeasure: number;
	readonly medicalServiceCode804n: string | null;
	readonly taxDeductionCategory: "1" | "2";
	readonly markingCode: string | null;
	readonly tag2000_markingPayload?: {
		readonly tag1163_markingCode: string;
		readonly tag2106_checkResult: number;
		readonly tag2107_productStatus: number;
		readonly gtin: string;
		readonly serialNumber: string;
	} | null | undefined;
}

export interface MultiTenderPaymentSplitInput {
	readonly cashRub?: number | undefined;
	readonly electronicCardRub?: number | undefined;
	readonly sberPayQrRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly creditPostpaymentRub?: number | undefined;
	readonly counterProvisionRub?: number | undefined;
}

export interface NormalizedMultiTenderPayments {
	readonly tag1031_cashKopecks: number;
	readonly tag1031_cashRub: number;
	readonly tag1031_cashRubString: string;
	readonly tag1081_electronicKopecks: number;
	readonly tag1081_electronicRub: number;
	readonly tag1081_electronicRubString: string;
	readonly sberCardKopecks: number;
	readonly sberPayQrKopecks: number;
	readonly tag1215_advanceOffsetKopecks: number;
	readonly tag1215_advanceOffsetRub: number;
	readonly tag1215_advanceOffsetRubString: string;
	readonly tag1216_creditPostpaymentKopecks: number;
	readonly tag1216_creditPostpaymentRub: number;
	readonly tag1217_counterProvisionKopecks: number;
	readonly tag1217_counterProvisionRub: number;
	readonly totalPaymentsKopecks: number;
	readonly totalPaymentsRub: number;
	readonly totalPaymentsRubString: string;
}

export interface BuildFiscalReceiptInput {
	readonly organizationId: string;
	readonly patientId: string;
	readonly customerContact: string; // Phone (+79...) or Email
	readonly cashierFullName: string;
	readonly cashierInn?: string | null | undefined;
	readonly operationType?: Ffd12Tag1054Operation | undefined;
	readonly taxationSystem?: Ffd12Tag1055Taxation | undefined;
	readonly paymentAddress?: string | undefined;
	readonly paymentPlace?: string | undefined;
	readonly clientMutationId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly documentId?: string | null | undefined;
	readonly invoiceId?: string | null | undefined;
	readonly positions: readonly FiscalReceiptPositionInput[];
	readonly tenderSplits: MultiTenderPaymentSplitInput;
	readonly defaultCalculationMethod?: Ffd12Tag1214Method | undefined;
	readonly isCorrectionReceipt?: boolean | undefined;
	readonly correctionBase?: {
		readonly type: Ffd12Tag1173CorrectionType;
		readonly documentDate: string; // YYYY-MM-DD
		readonly documentNumber: string;
	} | undefined;
}

export interface CompiledFiscal54FzReceipt {
	readonly organizationId: string;
	readonly patientId: string;
	readonly tag1054_operationType: number;
	readonly tag1055_taxationSystem: number;
	readonly tag1021_cashierName: string;
	readonly tag1203_cashierInn: string | null;
	readonly tag1008_customerContact: string;
	readonly tag1009_paymentAddress: string | null;
	readonly tag1187_paymentPlace: string | null;
	readonly tag1020_totalKopecks: number;
	readonly tag1020_totalRub: number;
	readonly tag1020_totalRubString: string;
	readonly totalRub: number;
	readonly payments: NormalizedMultiTenderPayments;
	readonly items: readonly NormalizedFiscalPosition[];
	readonly overallTaxDeductionCategory: "1" | "2";
	readonly isCorrection: boolean;
	readonly tag1173_correctionType?: number | undefined;
	readonly tag1178_correctionDocDate?: string | undefined;
	readonly tag1179_correctionDocNumber?: string | undefined;
	readonly visitId: string | null;
	readonly documentId: string | null;
	readonly invoiceId: string | null;
	readonly clientMutationId: string | null;
}

export class Fiscal54FzValidationError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "Fiscal54FzValidationError";
	}
}

/**
 * Standard Minzdrav Order 804n Dental Nomenclature Catalog & Regex Validator
 */
export const MINZDRAV_804N_CODE_REGEX = /^[A-B]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})?$/i;

export const MINZDRAV_804N_COMMON_CATALOG: Record<string, { title: string; category: string; expensiveCode2?: boolean }> = {
	"B01.065.001": { title: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный", category: "Консультация" },
	"B01.065.002": { title: "Прием (осмотр, консультация) врача-стоматолога-терапевта повторный", category: "Консультация" },
	"B01.066.001": { title: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный", category: "Консультация" },
	"B01.067.001": { title: "Прием (осмотр, консультация) врача-стоматолога-хирурга первичный", category: "Консультация" },
	"A16.07.002.001": { title: "Восстановление зуба пломбой (кариес эмали / дентина, I, V класс по Блэку)", category: "Терапия" },
	"A16.07.002.002": { title: "Восстановление зуба пломбой (кариес эмали / дентина, II, III класс по Блэку)", category: "Терапия" },
	"A16.07.002.003": { title: "Восстановление зуба пломбой с нарушением краевого прилегания (IV класс)", category: "Терапия" },
	"A16.07.008.001": { title: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (1 канал)", category: "Эндодонтия" },
	"A16.07.008.002": { title: "Пломбирование корневых каналов двухканального зуба (2 канала)", category: "Эндодонтия" },
	"A16.07.008.003": { title: "Пломбирование корневых каналов трехканального зуба (3 канала)", category: "Эндодонтия" },
	"A16.07.008.004": { title: "Пломбирование корневых каналов четырехканального зуба (4 канала)", category: "Эндодонтия" },
	"A16.07.030.001": { title: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)", category: "Эндодонтия" },
	"A16.07.030.002": { title: "Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)", category: "Эндодонтия" },
	"A16.07.030.003": { title: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)", category: "Эндодонтия" },
	"A16.07.030.004": { title: "Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)", category: "Эндодонтия" },
	"A16.07.001.001": { title: "Удаление постоянного зуба (простое)", category: "Хирургия" },
	"A16.07.001.002": { title: "Удаление постоянного зуба сложное с разъединением корней", category: "Хирургия" },
	"A16.07.001.003": { title: "Удаление ретинированного, дистопированного зуба (зуб мудрости)", category: "Хирургия" },
	"A16.07.054": { title: "Внутрикостная дентальная имплантация системы (титановый имплантат)", category: "Имплантология", expensiveCode2: true },
	"A16.07.055": { title: "Синус-лифтинг (костная пластика дна верхнечелюстной пазухи)", category: "Имплантология", expensiveCode2: true },
	"A16.07.006": { title: "Профессиональная гигиена полости рта и удаление зубных отложений ультразвуком / AirFlow", category: "Гигиена" },
	"A16.07.004": { title: "Восстановление зуба коронкой постоянной безметалловой (диоксид циркония / E.max)", category: "Ортопедия" },
};

export class Fiscal54FzService {
	/**
	 * Converts rubles to integer kopecks safely without floating point imprecision.
	 */
	public static rubToKopecks(rub: number | Decimal): number {
		const dec = rub instanceof Decimal ? rub : new Decimal(rub);
		if (!dec.isFinite()) {
			throw new Fiscal54FzValidationError("InvalidAmount", "Сумма в рублях должна быть конечным числом.");
		}
		return dec.times(100).round().toNumber();
	}

	/**
	 * Converts integer kopecks to rubles formatted as 2-decimal places.
	 */
	public static kopecksToRub(kopecks: number): number {
		if (!Number.isFinite(kopecks)) {
			throw new Fiscal54FzValidationError("InvalidKopecks", "Сумма в копейках должна быть конечным целым числом.");
		}
		return new Decimal(kopecks).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
	}

	/**
	 * Resolves Tag 1214: Calculation Method (Признак способа расчета)
	 */
	public static resolveTag1214(method: Ffd12Tag1214Method): number {
		const code = FFD12_TAG_1214_METHOD_CODES[method];
		if (!code) {
			return FFD12_TAG_1214_METHOD_CODES.full_payment;
		}
		return code;
	}

	/**
	 * Resolves Tag 1212: Calculation Subject (Признак предмета расчета)
	 */
	public static resolveTag1212(subject: Ffd12Tag1212Subject): number {
		const code = FFD12_TAG_1212_SUBJECT_CODES[subject];
		if (!code) {
			return FFD12_TAG_1212_SUBJECT_CODES.service;
		}
		return code;
	}

	/**
	 * Resolves Tag 1055: Taxation System (Применяемая СНО)
	 */
	public static resolveTag1055(taxation: Ffd12Tag1055Taxation): number {
		const code = FFD12_TAG_1055_TAXATION_CODES[taxation];
		if (!code) {
			return FFD12_TAG_1055_TAXATION_CODES.usn_income;
		}
		return code;
	}

	/**
	 * Resolves Tag 1054: Operation Type (Признак расчета)
	 */
	public static resolveTag1054(operation: Ffd12Tag1054Operation): number {
		const code = FFD12_TAG_1054_OPERATION_CODES[operation];
		if (!code) {
			return FFD12_TAG_1054_OPERATION_CODES.income;
		}
		return code;
	}

	/**
	 * Resolves Tag 1199: VAT Rate (Ставка НДС)
	 */
	public static resolveTag1199(vatRate: Ffd12Tag1199Vat): number {
		const code = FFD12_TAG_1199_VAT_CODES[vatRate];
		if (!code) {
			return FFD12_TAG_1199_VAT_CODES.vat_none; // Medical exemption
		}
		return code;
	}

	/**
	 * Resolves Tag 2108: Quantity Measure (Мера количества)
	 */
	public static resolveTag2108(measure: Ffd12Tag2108Measure): number {
		const code = FFD12_TAG_2108_MEASURE_CODES[measure];
		if (code === undefined) {
			return FFD12_TAG_2108_MEASURE_CODES.piece;
		}
		return code;
	}

	/**
	 * Normalizes and validates Tag 1030 Service / Item Name according to 54-FZ FFD 1.2
	 * - Trims whitespace
	 * - Eliminates non-printable ASCII control characters
	 * - Caps length at 128 characters (statutory FFD 1.2 maximum)
	 * - Incorporates Minzdrav Order 804n code prefix if present
	 */
	public static formatTag1030SubjectName(name: string, medicalServiceCode804n?: string | null): string {
		let clean = name.replace(/[\x00-\x1F\x7F]/g, " ").trim();
		if (!clean) {
			clean = "Медицинская стоматологическая услуга";
		}

		if (medicalServiceCode804n && MINZDRAV_804N_CODE_REGEX.test(medicalServiceCode804n.trim())) {
			const prefix = `[${medicalServiceCode804n.trim()}] `;
			if (!clean.startsWith(prefix) && !clean.includes(medicalServiceCode804n.trim())) {
				clean = `${prefix}${clean}`;
			}
		}

		if (clean.length > 128) {
			clean = clean.slice(0, 125).trimEnd() + "...";
		}

		return clean;
	}

	/**
	 * Automatically selects Minzdrav Order 804n endodontic line items for a tooth
	 */
	public static resolveEndodonticOrder804nItem(
		fdiNumber: number,
		canalCountOverride?: AnatomicalCanalCount | null,
	) {
		const canals = (canalCountOverride ?? getAnatomicalRootCanalCount(fdiNumber)) as AnatomicalCanalCount;
		const composite = calculateEndodonticCompositeTreatment(fdiNumber, {
			clinicalCanalCount: canals,
		});
		const pkg = getOrder804nEndoProcedureForTooth(fdiNumber, canals);

		return {
			fdiNumber,
			canalCount: canals,
			isMultiRooted: isMultiRootedTooth(fdiNumber) || canals >= 2,
			packageItem: pkg,
			compositeDetails: composite,
		};
	}

	/**
	 * Compiles multi-tender payment breakdown with strict kopeck-exact validation.
	 */
	public static compileMultiTenderPayments(
		tenderSplits: MultiTenderPaymentSplitInput,
	): NormalizedMultiTenderPayments {
		const cashKopecks = tenderSplits.cashRub !== undefined ? this.rubToKopecks(tenderSplits.cashRub) : 0;
		const sberCardKopecks = tenderSplits.electronicCardRub !== undefined ? this.rubToKopecks(tenderSplits.electronicCardRub) : 0;
		const sberPayQrKopecks = tenderSplits.sberPayQrRub !== undefined ? this.rubToKopecks(tenderSplits.sberPayQrRub) : 0;
		const advanceOffsetKopecks = tenderSplits.advanceOffsetRub !== undefined ? this.rubToKopecks(tenderSplits.advanceOffsetRub) : 0;
		const creditPostpaymentKopecks = tenderSplits.creditPostpaymentRub !== undefined ? this.rubToKopecks(tenderSplits.creditPostpaymentRub) : 0;
		const counterProvisionKopecks = tenderSplits.counterProvisionRub !== undefined ? this.rubToKopecks(tenderSplits.counterProvisionRub) : 0;

		if (
			cashKopecks < 0 ||
			sberCardKopecks < 0 ||
			sberPayQrKopecks < 0 ||
			advanceOffsetKopecks < 0 ||
			creditPostpaymentKopecks < 0 ||
			counterProvisionKopecks < 0
		) {
			throw new Fiscal54FzValidationError(
				"NegativePaymentTender",
				"Суммы видов оплат не могут быть отрицательными.",
			);
		}

		// In 54-FZ FFD 1.2: Tag 1081 combines all cashless/electronic forms (Card + SberPay QR / SBP)
		const electronicKopecks = sberCardKopecks + sberPayQrKopecks;

		const totalPaymentsKopecks =
			cashKopecks +
			electronicKopecks +
			advanceOffsetKopecks +
			creditPostpaymentKopecks +
			counterProvisionKopecks;

		return {
			tag1031_cashKopecks: cashKopecks,
			tag1031_cashRub: this.kopecksToRub(cashKopecks),
			tag1031_cashRubString: kopecksToNumericString(cashKopecks),
			tag1081_electronicKopecks: electronicKopecks,
			tag1081_electronicRub: this.kopecksToRub(electronicKopecks),
			tag1081_electronicRubString: kopecksToNumericString(electronicKopecks),
			sberCardKopecks,
			sberPayQrKopecks,
			tag1215_advanceOffsetKopecks: advanceOffsetKopecks,
			tag1215_advanceOffsetRub: this.kopecksToRub(advanceOffsetKopecks),
			tag1215_advanceOffsetRubString: kopecksToNumericString(advanceOffsetKopecks),
			tag1216_creditPostpaymentKopecks: creditPostpaymentKopecks,
			tag1216_creditPostpaymentRub: this.kopecksToRub(creditPostpaymentKopecks),
			tag1217_counterProvisionKopecks: counterProvisionKopecks,
			tag1217_counterProvisionRub: this.kopecksToRub(counterProvisionKopecks),
			totalPaymentsKopecks,
			totalPaymentsRub: this.kopecksToRub(totalPaymentsKopecks),
			totalPaymentsRubString: kopecksToNumericString(totalPaymentsKopecks),
		};
	}

	/**
	 * Builds and validates an FFD 1.2 statutory fiscal receipt payload.
	 */
	public static buildStatutoryFiscalReceipt(
		input: BuildFiscalReceiptInput,
	): CompiledFiscal54FzReceipt {
		if (!input.positions || input.positions.length === 0) {
			throw new Fiscal54FzValidationError(
				"EmptyPositions",
				"Чек по 54-ФЗ должен содержать как минимум одну позицию номенклатуры.",
			);
		}

		const defaultMethod = input.defaultCalculationMethod ?? "full_payment";
		const operationType = input.operationType ?? "income";
		const taxationSystem = input.taxationSystem ?? "usn_income";

		let totalItemsKopecks = 0;
		let hasCode2ExpensiveTreatment = false;

		const normalizedItems: NormalizedFiscalPosition[] = input.positions.map((pos, index) => {
			if (!pos.name || pos.name.trim().length === 0) {
				throw new Fiscal54FzValidationError(
					"InvalidPositionName",
					`Позиция №${index + 1} не имеет наименования.`,
				);
			}

			if (pos.quantity <= 0) {
				throw new Fiscal54FzValidationError(
					"InvalidQuantity",
					`Количество позиции «${pos.name}» должно быть строго больше нуля.`,
				);
			}

			const priceKopecks = this.rubToKopecks(pos.priceRub);
			if (priceKopecks <= 0) {
				throw new Fiscal54FzValidationError(
					"InvalidPrice",
					`Цена позиции «${pos.name}» должна быть строго больше нуля.`,
				);
			}

			const amountKopecks = Math.round(priceKopecks * pos.quantity);
			totalItemsKopecks += amountKopecks;

			const subject =
				pos.subject ??
				(pos.markingCode ? "goods_with_marking" : pos.name.toLowerCase().includes("аванс") ? "payment" : "service");
			const method = pos.method ?? defaultMethod;
			const vatRate = pos.vatRate ?? "vat_none";
			const measure = pos.measure ?? "piece";

			let code804n = pos.medicalServiceCode804n ?? null;
			if (!code804n && pos.toothFdiNumber) {
				const endo = this.resolveEndodonticOrder804nItem(pos.toothFdiNumber, pos.canalCount);
				code804n = endo.packageItem.code;
			}

			const tag1030 = this.formatTag1030SubjectName(pos.name, code804n);

			// Tax deduction category: check if service is Code 2 (expensive)
			let taxCat: "1" | "2" = pos.taxDeductionCategory ?? "1";
			if (
				pos.name.toLowerCase().includes("имплантац") ||
				pos.name.toLowerCase().includes("синус-лифтинг") ||
				pos.name.toLowerCase().includes("костная пластика") ||
				(code804n && MINZDRAV_804N_COMMON_CATALOG[code804n]?.expensiveCode2)
			) {
				taxCat = "2";
				hasCode2ExpensiveTreatment = true;
			}

			let markingPayload: NormalizedFiscalPosition["tag2000_markingPayload"] = null;
			if (pos.markingCode && pos.markingCode.trim().length > 0) {
				const parsedMarking = parseChestnyZnakDataMatrix(pos.markingCode);
				if (!parsedMarking.isValid || !parsedMarking.gtin || !parsedMarking.serialNumber) {
					throw new Fiscal54FzValidationError(
						"InvalidMarkingCode",
						`Некорректный код маркировки Честный ЗНАК для позиции «${pos.name}»: ${parsedMarking.errorMessage || "ошибка валидации"}`,
					);
				}
				markingPayload = buildFfd12Tag2000MarkingPayload({
					rawDataMatrix: pos.markingCode,
					gtin: parsedMarking.gtin,
					serialNumber: parsedMarking.serialNumber,
					cryptoKey: parsedMarking.cryptoKey,
					cryptoTail: parsedMarking.cryptoTail,
				});
			}

			return {
				tag1030_subjectName: tag1030,
				priceKopecks,
				quantity: pos.quantity,
				amountKopecks,
				priceRub: this.kopecksToRub(priceKopecks),
				amountRub: this.kopecksToRub(amountKopecks),
				tag1079_unitPriceRub: kopecksToNumericString(priceKopecks),
				tag1043_amountRub: kopecksToNumericString(amountKopecks),
				tag1212_paymentSubject: this.resolveTag1212(subject),
				tag1214_paymentMethod: this.resolveTag1214(method),
				tag1199_vatRate: this.resolveTag1199(vatRate),
				tag2108_quantityMeasure: this.resolveTag2108(measure),
				medicalServiceCode804n: code804n,
				taxDeductionCategory: taxCat,
				markingCode: pos.markingCode ?? null,
				tag2000_markingPayload: markingPayload,
			};
		});

		const payments = this.compileMultiTenderPayments(input.tenderSplits);

		// STRICT VALIDATION: Total amount of positions MUST equal total payments
		if (totalItemsKopecks !== payments.totalPaymentsKopecks) {
			throw new Fiscal54FzValidationError(
				"ReceiptBalanceMismatch",
				`Сумма позиций чека (${totalItemsKopecks} коп. / ${this.kopecksToRub(totalItemsKopecks)} руб.) ` +
					`не совпадает с суммой оплат по чеку (${payments.totalPaymentsKopecks} коп. / ${payments.totalPaymentsRub} руб.).`,
				{
					totalItemsKopecks,
					totalPaymentsKopecks: payments.totalPaymentsKopecks,
				},
			);
		}

		return {
			organizationId: input.organizationId,
			patientId: input.patientId,
			tag1054_operationType: this.resolveTag1054(operationType),
			tag1055_taxationSystem: this.resolveTag1055(taxationSystem),
			tag1021_cashierName: input.cashierFullName.trim() || "Кассир-администратор",
			tag1203_cashierInn: input.cashierInn?.trim() || null,
			tag1008_customerContact: input.customerContact.trim(),
			tag1009_paymentAddress: input.paymentAddress?.trim() || null,
			tag1187_paymentPlace: input.paymentPlace?.trim() || null,
			tag1020_totalKopecks: totalItemsKopecks,
			tag1020_totalRub: this.kopecksToRub(totalItemsKopecks),
			tag1020_totalRubString: kopecksToNumericString(totalItemsKopecks),
			totalRub: this.kopecksToRub(totalItemsKopecks),
			payments,
			items: normalizedItems,
			overallTaxDeductionCategory: hasCode2ExpensiveTreatment ? "2" : "1",
			isCorrection: Boolean(input.isCorrectionReceipt),
			tag1173_correctionType: input.correctionBase
				? FFD12_TAG_1173_CORRECTION_CODES[input.correctionBase.type]
				: undefined,
			tag1178_correctionDocDate: input.correctionBase?.documentDate,
			tag1179_correctionDocNumber: input.correctionBase?.documentNumber,
			visitId: input.visitId || null,
			documentId: input.documentId || null,
			invoiceId: input.invoiceId || null,
			clientMutationId: input.clientMutationId || null,
		};
	}

	/**
	 * Calculates advance offset settlement when patient pays invoice using prior deposit
	 * + optional additional co-pay via Cash / Card / SberPay QR.
	 */
	public static calculateAdvanceOffsetReceipt(params: {
		organizationId: string;
		patientId: string;
		customerContact: string;
		cashierFullName: string;
		availableAdvanceDepositRub: number;
		invoiceTotalRub: number;
		additionalCashRub?: number | undefined;
		additionalElectronicRub?: number | undefined;
		additionalSberPayQrRub?: number | undefined;
		positions: readonly FiscalReceiptPositionInput[];
		visitId?: string | null | undefined;
		documentId?: string | null | undefined;
		invoiceId?: string | null | undefined;
		clientMutationId?: string | null | undefined;
	}): CompiledFiscal54FzReceipt {
		const totalInvoiceKopecks = this.rubToKopecks(params.invoiceTotalRub);
		const availableDepositKopecks = this.rubToKopecks(params.availableAdvanceDepositRub);

		// How much can be covered by the advance deposit
		const advanceOffsetKopecks = Math.min(totalInvoiceKopecks, availableDepositKopecks);
		const advanceOffsetRub = this.kopecksToRub(advanceOffsetKopecks);

		// The additional payments must cover the remaining due
		const tenderSplits: MultiTenderPaymentSplitInput = {
			advanceOffsetRub,
			cashRub: params.additionalCashRub,
			electronicCardRub: params.additionalElectronicRub,
			sberPayQrRub: params.additionalSberPayQrRub,
		};

		return this.buildStatutoryFiscalReceipt({
			organizationId: params.organizationId,
			patientId: params.patientId,
			customerContact: params.customerContact,
			cashierFullName: params.cashierFullName,
			operationType: "income",
			defaultCalculationMethod: "full_payment", // Tag 1214 = 4 (Полный расчет с зачетом аванса)
			tenderSplits,
			positions: params.positions,
			visitId: params.visitId,
			documentId: params.documentId,
			invoiceId: params.invoiceId,
			clientMutationId: params.clientMutationId,
		});
	}

	/**
	 * Builds a statutory 54-FZ QR code string for printed/digital receipts:
	 * Example: `t=20260822T2145&s=2500.00&fn=9999078900012345&i=4821&fp=3920194821&n=1`
	 */
	public static generate54FzQrString(params: {
		issuedAt: Date;
		totalRub: number;
		fnSerial: string;
		fiscalDocNumber: string | number;
		fiscalSign: string | number;
		operationType: number; // 1 = income, 2 = income_return
	}): string {
		const pad = (n: number) => String(n).padStart(2, "0");
		const yyyy = params.issuedAt.getFullYear();
		const MM = pad(params.issuedAt.getMonth() + 1);
		const dd = pad(params.issuedAt.getDate());
		const HH = pad(params.issuedAt.getHours());
		const mm = pad(params.issuedAt.getMinutes());

		const timeStr = `${yyyy}${MM}${dd}T${HH}${mm}`;
		const sumStr = new Decimal(params.totalRub).toFixed(2);
		const fn = encodeURIComponent(String(params.fnSerial).trim());
		const fd = encodeURIComponent(String(params.fiscalDocNumber).trim());
		const fpd = encodeURIComponent(String(params.fiscalSign).trim());
		const n = params.operationType;

		return `t=${timeStr}&s=${sumStr}&fn=${fn}&i=${fd}&fp=${fpd}&n=${n}`;
	}

	/**
	 * Builds OFD verification link
	 */
	public static generateOfdVerificationUrl(params: {
		fnSerial: string;
		fiscalDocNumber: string | number;
		fiscalSign: string | number;
		totalRub: number;
		operationType: number;
	}): string {
		const sumStr = new Decimal(params.totalRub).toFixed(2);
		const fn = encodeURIComponent(String(params.fnSerial).trim());
		const fd = encodeURIComponent(String(params.fiscalDocNumber).trim());
		const fpd = encodeURIComponent(String(params.fiscalSign).trim());
		return `https://ofd.ru/check?fn=${fn}&fd=${fd}&fpd=${fpd}&s=${sumStr}&n=${params.operationType}`;
	}
}
