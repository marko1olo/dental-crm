/**
 * packages/shared/src/fiscal/tenderTypes.ts
 *
 * DENTE Dental CRM — Single Source of Truth (SSOT) for Payment Tenders,
 * FFD 1.2 Fiscal Tags (54-FZ), VAT Rates & Multi-Tender Split Arithmetic.
 *
 * Governed by:
 * - Federal Law No. 54-FZ & Order of FTS Russia No. ED-7-20/662@ (FFD 1.2)
 * - Mandate 8e: Doctor & Cashier Autonomy (Zero blocking disabled controls, optional INN for individuals)
 * - Mandate 8i: Integer kopecks precision, zero float rounding drift (IEEE-754 protection)
 * - Mandate 8s: Universal Single Source of Truth (SSOT) & Anti-Duplication Law
 */

import { z } from "zod";
import {
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12VatRate,
	ffd12OperationTypeSchema,
	ffd12PaymentMethodSchema,
	ffd12PaymentSubjectSchema,
	ffd12VatRateSchema,
} from "./ffd12Types.js";
import { kopecksToRub, rubToKopecks } from "./kopecksArithmetic.js";

// ─── 1. CANONICAL PAYMENT TENDER ENUM & SCHEMAS ──────────────────────────────

/**
 * Canonical Payment Tender Types across the entire CRM (Front, Back, Fiscal KKT).
 * Statutory 54-FZ / FFD 1.2 Tags:
 * - cash: Tag 1031 (Наличные)
 * - card / sbp / bank_transfer / other: Tag 1081 (Безналичные)
 * - deposit / family_wallet: Tag 1215 (Зачет аванса / депозит)
 * - credit: Tag 1216 (Постоплата / кредит)
 * - insurance / certificate / loyalty_points: Tag 1217 (Встречное предоставление)
 */
export const canonicalTenderTypeSchema = z.enum([
	"cash",
	"card",
	"sbp",
	"bank_transfer",
	"deposit",
	"family_wallet",
	"credit",
	"insurance",
	"certificate",
	"loyalty_points",
	"other",
]);
export type CanonicalTenderType = z.infer<typeof canonicalTenderTypeSchema>;

export const extendedTenderTypeSchema = z.enum([
	"cash",
	"card",
	"sbp",
	"bank_transfer",
	"deposit",
	"family_wallet",
	"credit",
	"insurance",
	"certificate",
	"loyalty_points",
	"other",
	"split",
	"mixed",
]);
export type ExtendedTenderType = z.infer<typeof extendedTenderTypeSchema>;

export const CANONICAL_TENDER_LABELS_RU: Record<CanonicalTenderType, string> = {
	cash: "Наличные в кассу",
	card: "Банковская карта (POS-терминал)",
	sbp: "СБП (QR-код)",
	bank_transfer: "Банковский перевод на р/с",
	deposit: "Личный депозит пациента",
	family_wallet: "Семейный баланс (Family Wallet)",
	credit: "Рассрочка / Постоплата",
	insurance: "Страховая компания (ДМС)",
	certificate: "Подарочный сертификат",
	loyalty_points: "Баллы программы лояльности",
	other: "Иной способ расчета",
};

export const CANONICAL_TENDER_FFD12_TAGS: Record<CanonicalTenderType, 1031 | 1081 | 1215 | 1216 | 1217> = {
	cash: 1031,
	card: 1081,
	sbp: 1081,
	bank_transfer: 1081,
	deposit: 1215,
	family_wallet: 1215,
	credit: 1216,
	insurance: 1217,
	certificate: 1217,
	loyalty_points: 1217,
	other: 1081,
};

/**
 * Normalizes any legacy alias, shorthand or Cyrillic label into a CanonicalTenderType.
 */
export function normalizeTenderType(alias: string | null | undefined): CanonicalTenderType {
	if (!alias) return "cash";
	const normalized = alias.trim().toLowerCase();
	switch (normalized) {
		case "cash":
		case "нал":
		case "наличные":
		case "наличный":
		case "купюры":
			return "cash";
		case "card":
		case "bank_card":
		case "card_terminal":
		case "terminal":
		case "pos":
		case "терминал":
		case "карта":
		case "эквайринг":
		case "безнал":
			return "card";
		case "sbp":
		case "sbp_qr":
		case "sberpay_qr":
		case "qr":
		case "сбп":
		case "qr_код":
		case "online":
			return "sbp";
		case "bank_transfer":
		case "bank_invoice":
		case "расчетный_счет":
		case "р/с":
		case "перевод":
			return "bank_transfer";
		case "deposit":
		case "advance":
		case "advance_deposit":
		case "patient_deposit":
		case "депозит":
		case "аванс":
			return "deposit";
		case "family_wallet":
		case "family_balance":
		case "family_deposit":
		case "family":
		case "семейный":
		case "семейный_баланс":
		case "семейный_депозит":
			return "family_wallet";
		case "credit":
		case "installment":
		case "installment_balance":
		case "рассрочка":
		case "кредит":
		case "постоплата":
			return "credit";
		case "insurance":
		case "dms":
		case "dms_insurance":
		case "дмс":
		case "страховая":
		case "гарантийное_письмо":
			return "insurance";
		case "certificate":
		case "gift_certificate":
		case "certificate_or_bonus":
		case "сертификат":
			return "certificate";
		case "loyalty_points":
		case "bonus":
		case "bonuses":
		case "бонусы":
		case "баллы":
			return "loyalty_points";
		default:
			return "other";
	}
}

export function isElectronicTender(tender: CanonicalTenderType): boolean {
	return CANONICAL_TENDER_FFD12_TAGS[tender] === 1081;
}

export function isAdvanceDepositTender(tender: CanonicalTenderType): boolean {
	return CANONICAL_TENDER_FFD12_TAGS[tender] === 1215;
}

// ─── 2. VAT RATES SSOT (TAG 1199) ────────────────────────────────────────────

export const VAT_RATE_LABELS_RU: Record<Ffd12VatRate, string> = {
	vat_none: "Без НДС (освобождено по ст. 149 НК РФ)",
	vat_0: "НДС 0%",
	vat_10: "НДС 10%",
	vat_20: "НДС 20%",
	vat_10_110: "НДС расч. 10/110",
	vat_20_120: "НДС расч. 20/120",
};

/**
 * Normalizes any VAT rate representation (number, string, alias) to canonical Ffd12VatRate.
 * Default for dental healthcare services is 'vat_none' (exempt under Art. 149 RF Tax Code).
 */
export function normalizeVatRate(rawRate: unknown): Ffd12VatRate {
	if (rawRate === null || rawRate === undefined || rawRate === "") {
		return "vat_none";
	}
	if (typeof rawRate === "string") {
		const clean = rawRate.trim().toLowerCase();
		if (clean === "vat_none" || clean === "none" || clean === "без ндс" || clean === "без_ндс" || clean === "exempt") {
			return "vat_none";
		}
		if (clean === "vat_20" || clean === "20" || clean === "20%" || clean === "20/120") return "vat_20";
		if (clean === "vat_10" || clean === "10" || clean === "10%" || clean === "10/110") return "vat_10";
		if (clean === "vat_0" || clean === "0" || clean === "0%") return "vat_0";
		if (clean === "vat_20_120") return "vat_20_120";
		if (clean === "vat_10_110") return "vat_10_110";
	}
	if (typeof rawRate === "number") {
		if (rawRate === 20) return "vat_20";
		if (rawRate === 10) return "vat_10";
		if (rawRate === 0) return "vat_none";
	}
	return "vat_none";
}

/**
 * Computes included VAT amount in integer kopecks without float drift.
 */
export function calculateVatKopecksFromTotal(amountKopecks: number, vatRate: Ffd12VatRate): number {
	if (amountKopecks <= 0) return 0;
	switch (vatRate) {
		case "vat_20":
		case "vat_20_120":
			return Math.round((amountKopecks * 20) / 120);
		case "vat_10":
		case "vat_10_110":
			return Math.round((amountKopecks * 10) / 110);
		default:
			return 0;
	}
}

// ─── 3. FFD 1.2 STATUTORY TAG 1214 & TAG 1212 LABELS & NORMALIZERS ────────────

export const FFD12_METHOD_LABELS_RU: Record<Ffd12PaymentMethod, string> = {
	full_payment: "Полный расчет (Тег 1214 = 4)",
	advance: "Аванс (Тег 1214 = 3)",
	full_prepayment: "Предоплата 100% (Тег 1214 = 1)",
	prepayment: "Частичная предоплата (Тег 1214 = 2)",
	partial_payment_and_credit: "Частичный расчет и кредит (Тег 1214 = 5)",
	credit_handover: "Передача в кредит (Тег 1214 = 6)",
	credit_payment: "Оплата кредита (Тег 1214 = 7)",
};

export const FFD12_SUBJECT_LABELS_RU: Record<Ffd12PaymentSubject, string> = {
	service: "Медицинская услуга (Тег 1212 = 4)",
	commodity: "Товар (Тег 1212 = 1)",
	job: "Работа (Тег 1212 = 3)",
	payment: "Платеж / Аванс (Тег 1212 = 10)",
	agency_fee: "Агентское вознаграждение (Тег 1212 = 11)",
	composite: "Составной предмет расчета (Тег 1212 = 13)",
	other: "Иной предмет расчета (Тег 1212 = 14)",
	excisable_goods_with_marking: "Подакцизный товар с маркировкой (Тег 1212 = 30)",
	excisable_goods_without_marking: "Подакцизный товар без маркировки (Тег 1212 = 31)",
	goods_with_marking: "Маркированный товар Честный ЗНАК / МДЛП (Тег 1212 = 32)",
	goods_without_marking: "Товар с обязательной маркировкой без кода (Тег 1212 = 33)",
};

export function normalizeCalculationMethod(alias: string | null | undefined): Ffd12PaymentMethod {
	if (!alias) return "full_payment";
	const normalized = alias.trim().toLowerCase();
	switch (normalized) {
		case "full_prepayment":
		case "предоплата_100":
		case "100_предоплата":
			return "full_prepayment";
		case "prepayment":
		case "partial_prepayment":
		case "предоплата":
			return "prepayment";
		case "advance":
		case "аванс":
			return "advance";
		case "partial_payment_and_credit":
			return "partial_payment_and_credit";
		case "credit_handover":
		case "credit":
		case "кредит":
		case "рассрочка":
			return "credit_handover";
		case "credit_payment":
			return "credit_payment";
		default:
			return "full_payment";
	}
}

export function normalizeCalculationSubject(alias: string | null | undefined): Ffd12PaymentSubject {
	if (!alias) return "service";
	const normalized = alias.trim().toLowerCase();
	switch (normalized) {
		case "commodity":
		case "goods":
		case "retail":
		case "товар":
			return "commodity";
		case "job":
		case "работа":
			return "job";
		case "payment":
		case "advance":
		case "платеж":
			return "payment";
		case "goods_with_marking":
		case "marked":
		case "маркировка":
		case "мдлп":
		case "честный_знак":
			return "goods_with_marking";
		default:
			return "service";
	}
}

// ─── 4. CANONICAL MULTI-TENDER SPLIT CALCULATOR ──────────────────────────────

export interface CanonicalSplitInput {
	readonly cashRub?: number | undefined;
	readonly cashKopecks?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly cardKopecks?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly sbpKopecks?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly depositKopecks?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly familyWalletKopecks?: number | undefined;
	readonly insuranceRub?: number | undefined;
	readonly insuranceKopecks?: number | undefined;
	readonly creditRub?: number | undefined;
	readonly creditKopecks?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly certificateKopecks?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly receivedCashKopecks?: number | undefined;
	readonly totalDueKopecks?: number | undefined;
	readonly totalDueRub?: number | undefined;
}

export type CanonicalSplitCalculationInput = CanonicalSplitInput;

export interface CanonicalSplitItemAllocation {
	readonly kind: CanonicalTenderType;
	readonly nameRu: string;
	readonly ffd12Tag: 1031 | 1081 | 1215 | 1216 | 1217;
	readonly amountKopecks: number;
	readonly amountRub: number;
}

export type CanonicalActiveTenderEntry = CanonicalSplitItemAllocation;

export interface CanonicalSplitResult {
	readonly cashKopecks: number;
	readonly cashRub: number;
	readonly cardKopecks: number;
	readonly cardRub: number;
	readonly sbpKopecks: number;
	readonly sbpRub: number;
	readonly depositKopecks: number;
	readonly depositRub: number;
	readonly familyWalletKopecks: number;
	readonly familyWalletRub: number;
	readonly insuranceKopecks: number;
	readonly insuranceRub: number;
	readonly creditKopecks: number;
	readonly creditRub: number;
	readonly certificateKopecks: number;
	readonly certificateRub: number;
	readonly tag1031_cashKopecks: number;
	readonly tag1031_cashRub: number;
	readonly tag1081_electronicKopecks: number;
	readonly tag1081_electronicRub: number;
	readonly tag1215_advanceOffsetKopecks: number;
	readonly tag1215_advanceOffsetRub: number;
	readonly tag1216_creditKopecks: number;
	readonly tag1216_creditRub: number;
	readonly tag1217_counterProvisionKopecks: number;
	readonly tag1217_counterProvisionRub: number;
	readonly patientPaidKopecks: number;
	readonly patientPaidRub: number;
	readonly patientCoPayKopecks: number;
	readonly patientCoPayRub: number;
	readonly totalAllocatedKopecks: number;
	readonly totalAllocatedRub: number;
	readonly allocatedKopecks: number;
	readonly totalDueKopecks: number;
	readonly totalDueRub: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly advanceOffsetKopecks: number;
	readonly advanceOffsetRub: number;
	readonly remainingKopecks: number;
	readonly remainingRub: number;
	readonly receivedCashKopecks: number;
	readonly receivedCashRub: number;
	readonly changeKopecks: number;
	readonly changeRub: number;
	readonly isCashShortage: boolean;
	readonly cashShortageKopecks: number;
	readonly cashShortageRub: number;
	readonly isBalanced: boolean;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
	readonly activeTenders: readonly CanonicalSplitItemAllocation[];
}

export type CanonicalSplitCalculationResult = CanonicalSplitResult;

function resolveKop(kop?: number, rub?: number): number {
	if (kop !== undefined) return Math.max(0, Math.round(kop));
	if (rub !== undefined) return Math.max(0, rubToKopecks(rub));
	return 0;
}

/**
 * Calculates multi-tender payment breakdown with strict 100% integer kopeck arithmetic.
 * Accepts either (totalDueKopecks, input) or (inputWithTotalDue).
 */
export function calculateCanonicalSplit(
	totalDueOrInput: number | CanonicalSplitInput,
	maybeInput?: CanonicalSplitInput,
): CanonicalSplitResult {
	const input: CanonicalSplitInput = typeof totalDueOrInput === "number" ? (maybeInput ?? {}) : (totalDueOrInput ?? {});
	const safeTotalDueKop = typeof totalDueOrInput === "number"
		? Math.max(0, Math.round(totalDueOrInput))
		: resolveKop(input.totalDueKopecks, input.totalDueRub);

	const cashKopecks = resolveKop(input.cashKopecks, input.cashRub);
	const cardKopecks = resolveKop(input.cardKopecks, input.cardRub);
	const sbpKopecks = resolveKop(input.sbpKopecks, input.sbpRub);
	const depositKopecks = resolveKop(input.depositKopecks, input.depositRub);
	const familyWalletKopecks = resolveKop(input.familyWalletKopecks, input.familyWalletRub);
	const insuranceKopecks = resolveKop(input.insuranceKopecks, input.insuranceRub);
	const creditKopecks = resolveKop(input.creditKopecks, input.creditRub);
	const certificateKopecks = resolveKop(input.certificateKopecks, input.certificateRub);

	const tag1031_cashKopecks = cashKopecks;
	const tag1081_electronicKopecks = cardKopecks + sbpKopecks;
	const tag1215_advanceOffsetKopecks = depositKopecks + familyWalletKopecks;
	const tag1216_creditKopecks = creditKopecks;
	const tag1217_counterProvisionKopecks = insuranceKopecks + certificateKopecks;

	const totalAllocatedKopecks =
		tag1031_cashKopecks +
		tag1081_electronicKopecks +
		tag1215_advanceOffsetKopecks +
		tag1216_creditKopecks +
		tag1217_counterProvisionKopecks;

	const remainingKopecks = Math.max(0, safeTotalDueKop - totalAllocatedKopecks);
	const isOverallocated = totalAllocatedKopecks > safeTotalDueKop;
	const isFullyAllocated = totalAllocatedKopecks === safeTotalDueKop;
	const patientPaidKopecks = totalAllocatedKopecks - insuranceKopecks;
	const patientCoPayKopecks = Math.max(0, safeTotalDueKop - insuranceKopecks);

	const receivedCashKopecks = input.receivedCashKopecks !== undefined || input.receivedCashRub !== undefined
		? resolveKop(input.receivedCashKopecks, input.receivedCashRub)
		: cashKopecks;

	let changeKopecks = 0;
	let isCashShortage = false;
	let cashShortageKopecks = 0;

	if (cashKopecks > 0) {
		if (receivedCashKopecks >= cashKopecks) {
			changeKopecks = receivedCashKopecks - cashKopecks;
		} else {
			isCashShortage = true;
			cashShortageKopecks = cashKopecks - receivedCashKopecks;
		}
	}

	const isBalanced = isFullyAllocated && !isCashShortage;

	const tenderEntries: Array<[CanonicalTenderType, number]> = [
		["cash", cashKopecks],
		["card", cardKopecks],
		["sbp", sbpKopecks],
		["deposit", depositKopecks],
		["family_wallet", familyWalletKopecks],
		["insurance", insuranceKopecks],
		["credit", creditKopecks],
		["certificate", certificateKopecks],
	];

	const activeTenders: CanonicalSplitItemAllocation[] = tenderEntries
		.filter(([, kop]) => kop > 0)
		.map(([kind, amountKopecks]) => ({
			kind,
			nameRu: CANONICAL_TENDER_LABELS_RU[kind],
			ffd12Tag: CANONICAL_TENDER_FFD12_TAGS[kind],
			amountKopecks,
			amountRub: kopecksToRub(amountKopecks),
		}));

		const advanceOffsetKopecks = tag1215_advanceOffsetKopecks + certificateKopecks;

	return {
		cashKopecks, cashRub: kopecksToRub(cashKopecks),
		cardKopecks, cardRub: kopecksToRub(cardKopecks),
		sbpKopecks, sbpRub: kopecksToRub(sbpKopecks),
		depositKopecks, depositRub: kopecksToRub(depositKopecks),
		familyWalletKopecks, familyWalletRub: kopecksToRub(familyWalletKopecks),
		insuranceKopecks, insuranceRub: kopecksToRub(insuranceKopecks),
		creditKopecks, creditRub: kopecksToRub(creditKopecks),
		certificateKopecks, certificateRub: kopecksToRub(certificateKopecks),
		tag1031_cashKopecks, tag1031_cashRub: kopecksToRub(tag1031_cashKopecks),
		tag1081_electronicKopecks, tag1081_electronicRub: kopecksToRub(tag1081_electronicKopecks),
		tag1215_advanceOffsetKopecks, tag1215_advanceOffsetRub: kopecksToRub(tag1215_advanceOffsetKopecks),
		tag1216_creditKopecks, tag1216_creditRub: kopecksToRub(tag1216_creditKopecks),
		tag1217_counterProvisionKopecks, tag1217_counterProvisionRub: kopecksToRub(tag1217_counterProvisionKopecks),
		patientPaidKopecks, patientPaidRub: kopecksToRub(patientPaidKopecks),
		patientCoPayKopecks, patientCoPayRub: kopecksToRub(patientCoPayKopecks),
		totalAllocatedKopecks, totalAllocatedRub: kopecksToRub(totalAllocatedKopecks),
		allocatedKopecks: totalAllocatedKopecks,
		totalDueKopecks: safeTotalDueKop, totalDueRub: kopecksToRub(safeTotalDueKop),
		totalKopecks: safeTotalDueKop, totalRub: kopecksToRub(safeTotalDueKop),
		advanceOffsetKopecks, advanceOffsetRub: kopecksToRub(advanceOffsetKopecks),
		remainingKopecks, remainingRub: kopecksToRub(remainingKopecks),
		receivedCashKopecks, receivedCashRub: kopecksToRub(receivedCashKopecks),
		changeKopecks, changeRub: kopecksToRub(changeKopecks),
		isCashShortage, cashShortageKopecks, cashShortageRub: kopecksToRub(cashShortageKopecks),
		isBalanced, isFullyAllocated, isOverallocated,
		activeTenders,
	};
}

// ─── 5. CASH DRAWER DENOMINATIONS SSOT ────────────────────────────────────────

export interface CashDenominationsInput {
	readonly b5000?: number | undefined;
	readonly b2000?: number | undefined;
	readonly b1000?: number | undefined;
	readonly b500?: number | undefined;
	readonly b200?: number | undefined;
	readonly b100?: number | undefined;
	readonly b50?: number | undefined;
	readonly c10?: number | undefined;
	readonly c5?: number | undefined;
	readonly c2?: number | undefined;
	readonly c1?: number | undefined;
	readonly coinsFractionalRub?: number | undefined;
}

/**
 * Calculates cash drawer denominations total in statutory integer kopecks.
 */
export function calculateDenominationsTotalKopecks(d: CashDenominationsInput): number {
	const b5000 = (d.b5000 || 0) * 500000;
	const b2000 = (d.b2000 || 0) * 200000;
	const b1000 = (d.b1000 || 0) * 100000;
	const b500 = (d.b500 || 0) * 50000;
	const b200 = (d.b200 || 0) * 20000;
	const b100 = (d.b100 || 0) * 10000;
	const b50 = (d.b50 || 0) * 5000;
	const c10 = (d.c10 || 0) * 1000;
	const c5 = (d.c5 || 0) * 500;
	const c2 = (d.c2 || 0) * 200;
	const c1 = (d.c1 || 0) * 100;
	const coins = Math.max(0, rubToKopecks(d.coinsFractionalRub || 0));

	return Math.round(b5000 + b2000 + b1000 + b500 + b200 + b100 + b50 + c10 + c5 + c2 + c1 + coins);
}

/**
 * Calculates cash drawer denominations total in rubles with exact 2-decimal precision.
 */
export function calculateDenominationsTotalRub(d: CashDenominationsInput): number {
	return kopecksToRub(calculateDenominationsTotalKopecks(d));
}

export {
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12VatRate,
	ffd12OperationTypeSchema,
	ffd12PaymentMethodSchema,
	ffd12PaymentSubjectSchema,
	ffd12VatRateSchema,
};
