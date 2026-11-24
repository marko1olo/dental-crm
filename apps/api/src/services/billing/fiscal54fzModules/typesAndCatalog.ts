/**
 * fiscal54fzModules/typesAndCatalog.ts — FFD 1.2 Tag Types, Validation Error & 804n Catalog.
 */

import {
	type AnatomicalCanalCount,
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_1222_AGENT_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	type Ffd12AgentSign,
	type Ffd12CorrectionType,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12QuantityMeasure,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
} from "@dental/shared";

export {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_1222_AGENT_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
};

export type Ffd12Tag1214Method = Ffd12PaymentMethod;
export type Ffd12Tag1212Subject = Ffd12PaymentSubject;
export type Ffd12Tag1055Taxation = Ffd12TaxationSystem;
export type Ffd12Tag1054Operation = Ffd12OperationType;
export type Ffd12Tag1199Vat = Ffd12VatRate;
export type Ffd12Tag2108Measure = Ffd12QuantityMeasure;
export type Ffd12Tag1173CorrectionType = Ffd12CorrectionType;
export type Ffd12Tag1057AgentSign = Ffd12AgentSign;

export interface FiscalReceiptPositionInput {
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly subject?: Ffd12Tag1212Subject | undefined;
	readonly method?: Ffd12Tag1214Method | undefined;
	readonly vatRate?: Ffd12Tag1199Vat | undefined;
	readonly measure?: Ffd12Tag2108Measure | undefined;
	readonly agentSign?: Ffd12Tag1057AgentSign | undefined;
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
	readonly tag1222_agentSign?: number | null | undefined;
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
	readonly customerContact: string;
	readonly customerName?: string | null | undefined;
	readonly customerInn?: string | null | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | null | undefined;
	readonly operationType?: Ffd12Tag1054Operation | undefined;
	readonly taxationSystem?: Ffd12Tag1055Taxation | undefined;
	readonly agentSign?: Ffd12Tag1057AgentSign | undefined;
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
		readonly documentDate: string;
		readonly documentNumber: string;
	} | undefined;
}

export interface CompiledFiscal54FzReceipt {
	readonly organizationId: string;
	readonly patientId: string;
	readonly tag1054_operationType: number;
	readonly tag1055_taxationSystem: number;
	readonly tag1057_agentSign?: number | null | undefined;
	readonly tag1021_cashierName: string;
	readonly tag1203_cashierInn: string | null;
	readonly tag1008_customerContact: string;
	readonly tag1227_customerName?: string | null | undefined;
	readonly tag1228_customerInn?: string | null | undefined;
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
