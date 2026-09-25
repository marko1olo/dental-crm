/**
 * mixedFiscalReceipt.ts — Statutory 54-FZ & FFD 1.2 Mixed Fiscal Receipts Engine,
 * Reception Desk Retail Showcase Catalog (Curaprox, Marvis, Biorepair, Waterpik)
 * and Clinic Gift Certificates (Nominals 3000 / 5000 / 10000 ₽, Tag 1215 Advance Offset).
 *
 * Tax Code of the Russian Federation:
 * - Subclause 2, Clause 2, Article 149: Dental medical services exempt from VAT (Tag 1199 = 6, Без НДС).
 * - Clause 3, Article 164: Retail sale of oral hygiene goods & cosmetics taxable at 20% VAT (Tag 1199 = 1, НДС 20%).
 * - FFD 1.2 Tag 1212: 1 = Commodity (Товар), 4 = Service (Услуга), 10 = Payment / Advance (Платеж / Аванс).
 * - FFD 1.2 Tag 1215: Advance & prepayment offset (Зачет аванса / подарочные сертификаты).
 */

import { z } from "zod";
import type {
	Ffd12OperationType,
	Ffd12PaymentMethod,
	Ffd12PaymentSubject,
	Ffd12QuantityMeasure,
	Ffd12TaxationSystem,
	Ffd12VatRate,
} from "./ffd12Types.js";
import {
	calculateVatKopecks,
	kopecksToNumericString,
	kopecksToRub,
	rubToKopecks,
} from "./kopecksArithmetic.js";
import { isNonMedicalGood } from "../documents/ndflXmlGenerator.js";

// ─── 1. Retail Product Catalog & Category Definitions ──────────────────────────

export type RetailProductCategory =
	| "brushes"
	| "pastes"
	| "irrigators"
	| "floss_and_rinses"
	| "certificates"
	| "other";

export interface RetailProductItem {
	readonly id: string;
	readonly sku: string; // Артикул
	readonly barcode: string; // Штрихкод EAN-13 / GTIN
	readonly name: string;
	readonly brand: string;
	readonly category: RetailProductCategory;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly vatRate: Ffd12VatRate; // "vat_20" для гигиены, "vat_none" для сертификатов
	readonly paymentSubject: Ffd12PaymentSubject; // "commodity" (1) или "payment" (10)
	readonly measure: Ffd12QuantityMeasure; // "piece" (0)
	readonly descriptionRu: string;
	readonly isMarked?: boolean | undefined;
}

/**
 * Стандартный ассортимент витрины стойки ресепшена клиники ДЕНТЕ.
 * Включает канонические бренды: Curaprox, Marvis, Biorepair, Waterpik, Oral-B
 * и официальные подарочные сертификаты клиники.
 */
export const RECEPTION_RETAIL_CATALOG: readonly RetailProductItem[] = [
	// ── Curaprox Зубные щетки и ершики (НДС 20%, Тег 1212 = 1) ──────────────
	{
		id: "curaprox-cs-5460",
		sku: "CUR-5460",
		barcode: "7612412422550",
		name: "Зубная щетка Curaprox CS 5460 Ultra Soft",
		brand: "Curaprox",
		category: "brushes",
		priceRub: 1200,
		priceKopecks: 120000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Ультрамягкая щетка с 5460 щетинками Curen (0.1 мм). Золотой стандарт атравматичной гигиены.",
	},
	{
		id: "curaprox-cs-1006",
		sku: "CUR-1006",
		barcode: "7612412100601",
		name: "Монопучковая зубная щетка Curaprox CS 1006 Single (6 мм)",
		brand: "Curaprox",
		category: "brushes",
		priceRub: 1100,
		priceKopecks: 110000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Для прецизионной точечной чистки пришеечной зоны, фиссур, брекетов и имплантатов.",
	},
	{
		id: "curaprox-prime-set",
		sku: "CUR-CPS-06",
		barcode: "7612412423021",
		name: "Набор межзубных ершиков Curaprox Prime Start 06-011",
		brand: "Curaprox",
		category: "brushes",
		priceRub: 1450,
		priceKopecks: 145000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "5 ершиков разного диаметра с двумя держателями UHS. Профилактика межзубного кариеса.",
	},
	{
		id: "curaprox-kids",
		sku: "CUR-KIDS",
		barcode: "7612412422703",
		name: "Детская зубная щетка Curaprox Kids (4–12 лет)",
		brand: "Curaprox",
		category: "brushes",
		priceRub: 1050,
		priceKopecks: 105000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "5500 ультратонких щетинок Curen. Бережный уход за сменным прикусом без повреждения эмали.",
	},

	// ── Зубные пасты Marvis и Biorepair (НДС 20%, Тег 1212 = 1) ─────────────
	{
		id: "marvis-classic-mint",
		sku: "MRV-85-CSM",
		barcode: "8004395111701",
		name: "Зубная паста Marvis Classic Strong Mint (85 мл)",
		brand: "Marvis",
		category: "pastes",
		priceRub: 1350,
		priceKopecks: 135000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Культовая итальянская паста с интенсивным освежающим вкусом перечной мяты.",
	},
	{
		id: "marvis-whitening-mint",
		sku: "MRV-85-WM",
		barcode: "8004395111718",
		name: "Зубная паста Marvis Whitening Mint Отбеливающая (85 мл)",
		brand: "Marvis",
		category: "pastes",
		priceRub: 1450,
		priceKopecks: 145000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Эффективное деликатное удаление налета от кофе и табака без повреждения эмали.",
	},
	{
		id: "biorepair-total-protection",
		sku: "BIO-75-TOT",
		barcode: "8017331048474",
		name: "Зубная паста Biorepair Total Protection Plus (75 мл)",
		brand: "Biorepair",
		category: "pastes",
		priceRub: 950,
		priceKopecks: 95000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "С микрочастицами microRepair (гидроксиапатит 20%) для естественной реминерализации эмали.",
	},
	{
		id: "biorepair-fast-sensitive",
		sku: "BIO-75-FSR",
		barcode: "8017331048481",
		name: "Зубная паста Biorepair Fast Sensitive Repair (75 мл)",
		brand: "Biorepair",
		category: "pastes",
		priceRub: 990,
		priceKopecks: 99000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Мгновенное запечатывание открытых дентинных канальцев при гиперчувствительности.",
	},

	// ── Ирригаторы полости рта Waterpik (НДС 20%, Тег 1212 = 1) ─────────────
	{
		id: "waterpik-wp-450",
		sku: "WP-450-E2",
		barcode: "073950275812",
		name: "Портативный ирригатор Waterpik WP-450 Cordless Plus",
		brand: "Waterpik",
		category: "irrigators",
		priceRub: 7900,
		priceKopecks: 790000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Беспроводной ирригатор с аккумулятором, 4 насадками и 2 режимами давления. Идеален для брекетов.",
	},
	{
		id: "waterpik-wp-660",
		sku: "WP-660-EU",
		barcode: "073950153493",
		name: "Стационарный ирригатор Waterpik WP-660 Aquarius Professional",
		brand: "Waterpik",
		category: "irrigators",
		priceRub: 11900,
		priceKopecks: 1190000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Премиальный стационарный ирригатор, 10 уровней давления, пульсирующий гидромассаж десен, 7 насадок.",
	},

	// ── Ополаскиватели и зубные нити (НДС 20%, Тег 1212 = 1) ─────────────────
	{
		id: "curaprox-perioplus-regenerate",
		sku: "CUR-PP-REG",
		barcode: "7612412424059",
		name: "Ополаскиватель Curaprox PerioPlus+ Regenerate 0.09% CHX (200 мл)",
		brand: "Curaprox",
		category: "floss_and_rinses",
		priceRub: 1800,
		priceKopecks: 180000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Хлоргексидин 0.09% + CITROX + гиалуроновая кислота. Ускоренная регенерация после имплантации и хирургии.",
	},
	{
		id: "oralb-pro-expert-floss",
		sku: "ORB-PE-FLOSS",
		barcode: "5010622005035",
		name: "Зубная нить Oral-B Pro-Expert Clinic Line Прохладная мята (25 м)",
		brand: "Oral-B",
		category: "floss_and_rinses",
		priceRub: 490,
		priceKopecks: 49000,
		vatRate: "vat_20",
		paymentSubject: "commodity",
		measure: "piece",
		descriptionRu: "Шелковистая моноволоконная нить с тефлоновым скольжением. Не расслаивается в тесных межзубных контактах.",
	},

	// ── Подарочные сертификаты клиники ДЕНТЕ (Аванс по 54-ФЗ, Тег 1212 = 10) ─
	{
		id: "gift-cert-3000",
		sku: "CERT-3000",
		barcode: "2000000003000",
		name: "Подарочный сертификат клиники ДЕНТЕ 3 000 ₽",
		brand: "ДЕНТЕ",
		category: "certificates",
		priceRub: 3000,
		priceKopecks: 300000,
		vatRate: "vat_none", // Продажа сертификата = аванс/предоплата за будущее лечение
		paymentSubject: "payment", // Тег 1212 = 10 (Платеж / Аванс)
		measure: "piece",
		descriptionRu: "Фирменный сертификат клиники на 3 000 ₽. Списывается в счет любых терапевтических или гигиенических услуг.",
	},
	{
		id: "gift-cert-5000",
		sku: "CERT-5000",
		barcode: "2000000005000",
		name: "Подарочный сертификат клиники ДЕНТЕ 5 000 ₽",
		brand: "ДЕНТЕ",
		category: "certificates",
		priceRub: 5000,
		priceKopecks: 500000,
		vatRate: "vat_none",
		paymentSubject: "payment",
		measure: "piece",
		descriptionRu: "Фирменный сертификат клиники на 5 000 ₽. Идеален для комплексной профессиональной гигиены и отбеливания.",
	},
	{
		id: "gift-cert-10000",
		sku: "CERT-10000",
		barcode: "2000000010000",
		name: "Подарочный сертификат клиники ДЕНТЕ 10 000 ₽",
		brand: "ДЕНТЕ",
		category: "certificates",
		priceRub: 10000,
		priceKopecks: 1000000,
		vatRate: "vat_none",
		paymentSubject: "payment",
		measure: "piece",
		descriptionRu: "Премиальный подарочный сертификат на 10 000 ₽. Засчитывается в счет терапевтического и ортопедического лечения.",
	},
];

/**
 * Канонические номиналы подарочных сертификатов клиники.
 */
export const CLINIC_GIFT_CERTIFICATE_NOMINALS = [3000, 5000, 10000] as const;

export type ClinicGiftCertificateNominal = (typeof CLINIC_GIFT_CERTIFICATE_NOMINALS)[number];

// ─── 2. Gift Certificate Redemption Logic (54-FZ Tag 1215) ───────────────────

export interface GiftCertificateRedemptionParams {
	readonly certificateNumber?: string | undefined;
	readonly nominalRub: number;
	readonly billTotalKopecks: number;
	readonly alreadyOffsetKopecks?: number | undefined;
}

export interface GiftCertificateRedemptionResult {
	readonly certificateNumber: string;
	readonly nominalKopecks: number;
	readonly nominalRub: number;
	readonly appliedKopecks: number;
	readonly appliedRub: number;
	readonly remainingBalanceKopecks: number;
	readonly remainingBalanceRub: number;
	readonly remainingDueKopecks: number;
	readonly remainingDueRub: number;
	readonly tag1215AdvanceKopecks: number;
}

/**
 * Расчет списания подарочного сертификата в счет оплаты лечения (54-ФЗ Тег 1215).
 * Сертификат засчитывается как аванс/предоплата, внесенная ранее.
 * Не может превышать общую задолженность по счету.
 */
export function calculateGiftCertificateRedemption(
	params: GiftCertificateRedemptionParams,
): GiftCertificateRedemptionResult {
	const nominalKopecks = Math.max(0, rubToKopecks(params.nominalRub));
	const billTotal = Math.max(0, Math.round(params.billTotalKopecks));
	const alreadyOffset = Math.max(0, Math.round(params.alreadyOffsetKopecks || 0));
	const unallocatedBillKopecks = Math.max(0, billTotal - alreadyOffset);

	// Сертификат списывается максимум в сумме непокрытого остатка счета
	const appliedKopecks = Math.min(nominalKopecks, unallocatedBillKopecks);
	const remainingBalanceKopecks = nominalKopecks - appliedKopecks;
	const remainingDueKopecks = unallocatedBillKopecks - appliedKopecks;

	return {
		certificateNumber: params.certificateNumber?.trim() || `CERT-${params.nominalRub}`,
		nominalKopecks,
		nominalRub: kopecksToRub(nominalKopecks),
		appliedKopecks,
		appliedRub: kopecksToRub(appliedKopecks),
		remainingBalanceKopecks,
		remainingBalanceRub: kopecksToRub(remainingBalanceKopecks),
		remainingDueKopecks,
		remainingDueRub: kopecksToRub(remainingDueKopecks),
		tag1215AdvanceKopecks: appliedKopecks,
	};
}

// ─── 3. Mixed Fiscal Receipt Types & Calculation ─────────────────────────────

export interface MixedReceiptLineInput {
	readonly id: string;
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly discountRub?: number | undefined;
	readonly code804n?: string | null | undefined;
	readonly toothNumber?: number | undefined;
	readonly category?: string | undefined;
	readonly vatRate?: Ffd12VatRate | undefined;
	readonly paymentSubject?: Ffd12PaymentSubject | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly markingCode?: string | null | undefined;
}

export interface CompiledMixedReceiptItem {
	readonly id: string;
	readonly name: string;
	readonly sku?: string | undefined;
	readonly barcode?: string | undefined;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly grossKopecks: number;
	readonly grossRub: number;
	readonly amountKopecks: number;
	readonly amountRub: number;
	/** Признак предмета расчета (Тег 1212: 1=Товар, 4=Услуга, 10=Платеж/аванс) */
	readonly tag1212_paymentSubject: number;
	readonly paymentSubject: Ffd12PaymentSubject;
	/** Ставка НДС (Тег 1199: 1=20%, 6=Без НДС) */
	readonly tag1199_vatRate: number;
	readonly vatRate: Ffd12VatRate;
	/** Рассчитанная сумма НДС в копейках (20/120 для товаров, 0 для медуслуг) */
	readonly vatKopecks: number;
	readonly vatRub: number;
	readonly isRetail: boolean;
	readonly isMarkedItem: boolean;
	readonly markingCode?: string | undefined;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
}

export interface MixedReceiptTendersInput {
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
}

export interface MixedReceiptTendersResult {
	readonly cashKopecks: number;
	readonly cashRub: number;
	readonly receivedCashKopecks: number;
	readonly receivedCashRub: number;
	readonly changeKopecks: number;
	readonly changeRub: number;
	readonly cardKopecks: number;
	readonly cardRub: number;
	readonly sbpKopecks: number;
	readonly sbpRub: number;
	readonly totalElectronicKopecks: number; // Тег 1081 (Карта + СБП QR)
	readonly totalElectronicRub: number;
	readonly depositKopecks: number;
	readonly depositRub: number;
	readonly familyWalletKopecks: number;
	readonly familyWalletRub: number;
	readonly certificateKopecks: number;
	readonly certificateRub: number;
	readonly tag1215AdvanceOffsetKopecks: number; // Тег 1215 (Депозит + Семья + Сертификат)
	readonly tag1215AdvanceOffsetRub: number;
	readonly totalAllocatedKopecks: number;
	readonly totalAllocatedRub: number;
	readonly remainingKopecks: number;
	readonly remainingRub: number;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
}

export interface MixedFiscalReceiptTotals {
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly medicalServicesKopecks: number;
	readonly medicalServicesRub: number;
	readonly retailGoodsKopecks: number;
	readonly retailGoodsRub: number;
	readonly vat20Kopecks: number;
	readonly vat20Rub: number;
	readonly vatNoneKopecks: number;
	readonly vatNoneRub: number;
	readonly hasMixedItems: boolean;
	readonly hasMedicalServices: boolean;
	readonly hasRetailGoods: boolean;
	readonly itemsCount: number;
	readonly retailItemsCount: number;
	readonly medicalItemsCount: number;
}

export interface MixedFiscalReceiptResult {
	readonly items: readonly CompiledMixedReceiptItem[];
	readonly totals: MixedFiscalReceiptTotals;
	readonly tenders: MixedReceiptTendersResult;
	readonly ofdVerificationPayload: {
		readonly totalRubFormatted: string;
		readonly vat20RubFormatted: string;
		readonly vatNoneRubFormatted: string;
		readonly tag1031_cashRub: string;
		readonly tag1081_electronicRub: string;
		readonly tag1215_prepaidAdvanceOffsetRub: string;
	};
}

/**
 * Определение, является ли позиция розничным товаром стойки ресепшена.
 */
export function isRetailCommodityItem(item: {
	name?: string | undefined;
	category?: string | undefined;
	paymentSubject?: Ffd12PaymentSubject | undefined;
	vatRate?: Ffd12VatRate | undefined;
	isRetail?: boolean | undefined;
}): boolean {
	if (item.isRetail === true) return true;
	if (item.paymentSubject === "commodity") return true;
	if (item.vatRate === "vat_20") return true;

	const cat = (item.category || "").toLowerCase();
	if (["retail", "goods", "brushes", "pastes", "irrigators", "floss_and_rinses", "certificates"].includes(cat)) {
		return true;
	}

	return isNonMedicalGood(item.name, item.category);
}

/**
 * Чистый расчет смешанного фискального чека 54-ФЗ (ФФД 1.2).
 * Разделяет медицинские услуги (Без НДС, ст. 149 НК) и розничные товары (НДС 20%).
 * Вычисляет суммы в целочисленных копейках без float-дрейфа.
 */
export function calculateMixedFiscalReceipt(params: {
	readonly items: readonly MixedReceiptLineInput[];
	readonly tenders?: MixedReceiptTendersInput | undefined;
}): MixedFiscalReceiptResult {
	const compiledItems: CompiledMixedReceiptItem[] = [];
	let totalKopecks = 0;
	let medicalServicesKopecks = 0;
	let retailGoodsKopecks = 0;
	let vat20Kopecks = 0;
	let vatNoneKopecks = 0;

	for (const rawItem of params.items) {
		const qty = Math.max(1, rawItem.quantity || 1);
		const unitPriceKop = rubToKopecks(rawItem.priceRub);
		const discountKop = rawItem.discountRub ? rubToKopecks(rawItem.discountRub) : 0;
		const grossKop = unitPriceKop * qty;
		const netKop = Math.max(0, grossKop - discountKop);

		const isRetail = isRetailCommodityItem(rawItem);
		const isCertificate =
			rawItem.category === "certificates" ||
			rawItem.name.toLowerCase().includes("сертификат");

		// 1. Определение признака предмета расчета (Тег 1212)
		let paymentSubject: Ffd12PaymentSubject;
		let tag1212: number;
		if (rawItem.paymentSubject) {
			paymentSubject = rawItem.paymentSubject;
			tag1212 =
				paymentSubject === "commodity"
					? 1
					: paymentSubject === "payment"
						? 10
						: paymentSubject === "goods_with_marking"
							? 32
							: 4;
		} else if (isCertificate) {
			paymentSubject = "payment";
			tag1212 = 10; // Тег 1212 = 10 (Платеж / Аванс)
		} else if (isRetail) {
			paymentSubject = rawItem.markingCode ? "goods_with_marking" : "commodity";
			tag1212 = rawItem.markingCode ? 32 : 1; // Тег 1212 = 1 (Товар)
		} else {
			paymentSubject = "service";
			tag1212 = 4; // Тег 1212 = 4 (Услуга)
		}

		// 2. Определение ставки НДС (Тег 1199)
		let vatRate: Ffd12VatRate;
		let tag1199: number;
		if (rawItem.vatRate) {
			vatRate = rawItem.vatRate;
			tag1199 = vatRate === "vat_20" ? 1 : 6;
		} else if (isRetail && !isCertificate) {
			vatRate = "vat_20";
			tag1199 = 1; // Тег 1199 = 1 (20% НДС)
		} else {
			vatRate = "vat_none";
			tag1199 = 6; // Тег 1199 = 6 (Без НДС по пп. 2 п. 2 ст. 149 НК РФ)
		}

		// 3. Расчет суммы НДС в целых копейках
		const itemVatKopecks = calculateVatKopecks(netKop, vatRate);

		// 4. Налоговый вычет НДФЛ: доступен ТОЛЬКО для медицинских услуг
		let taxDeductionCategory: "1" | "2" | undefined;
		if (!isRetail && !isCertificate) {
			const lower = rawItem.name.toLowerCase();
			if (
				lower.includes("имплант") ||
				lower.includes("синус") ||
				lower.includes("костная пластика") ||
				rawItem.code804n?.startsWith("A16.07.054")
			) {
				taxDeductionCategory = "2";
			} else {
				taxDeductionCategory = "1";
			}
		}

		totalKopecks += netKop;
		if (isRetail && !isCertificate) {
			retailGoodsKopecks += netKop;
			vat20Kopecks += itemVatKopecks;
		} else {
			medicalServicesKopecks += netKop;
			vatNoneKopecks += netKop;
		}

		compiledItems.push({
			id: rawItem.id,
			name: rawItem.name,
			sku: rawItem.sku,
			barcode: rawItem.barcode,
			code804n: rawItem.code804n || undefined,
			toothNumber: rawItem.toothNumber,
			quantity: qty,
			unitPriceRub: kopecksToRub(unitPriceKop),
			unitPriceKopecks: unitPriceKop,
			discountRub: kopecksToRub(discountKop),
			discountKopecks: discountKop,
			grossKopecks: grossKop,
			grossRub: kopecksToRub(grossKop),
			amountKopecks: netKop,
			amountRub: kopecksToRub(netKop),
			tag1212_paymentSubject: tag1212,
			paymentSubject,
			tag1199_vatRate: tag1199,
			vatRate,
			vatKopecks: itemVatKopecks,
			vatRub: kopecksToRub(itemVatKopecks),
			isRetail: isRetail && !isCertificate,
			isMarkedItem: Boolean(rawItem.markingCode),
			markingCode: rawItem.markingCode || undefined,
			taxDeductionCategory,
		});
	}

	const hasMedical = medicalServicesKopecks > 0;
	const hasRetail = retailGoodsKopecks > 0;
	const hasMixed = hasMedical && hasRetail;

	const totals: MixedFiscalReceiptTotals = {
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		medicalServicesKopecks,
		medicalServicesRub: kopecksToRub(medicalServicesKopecks),
		retailGoodsKopecks,
		retailGoodsRub: kopecksToRub(retailGoodsKopecks),
		vat20Kopecks,
		vat20Rub: kopecksToRub(vat20Kopecks),
		vatNoneKopecks,
		vatNoneRub: kopecksToRub(vatNoneKopecks),
		hasMixedItems: hasMixed,
		hasMedicalServices: hasMedical,
		hasRetailGoods: hasRetail,
		itemsCount: compiledItems.length,
		retailItemsCount: compiledItems.filter((i) => i.isRetail).length,
		medicalItemsCount: compiledItems.filter((i) => !i.isRetail).length,
	};

	// ── Расчет способов оплаты (Tenders) ───────────────────────────────────────
	const tendersInput = params.tenders || {};
	const cashKop = tendersInput.cashRub !== undefined ? rubToKopecks(tendersInput.cashRub) : 0;
	const cardKop = tendersInput.cardRub !== undefined ? rubToKopecks(tendersInput.cardRub) : 0;
	const sbpKop = tendersInput.sbpRub !== undefined ? rubToKopecks(tendersInput.sbpRub) : 0;
	const depositKop = tendersInput.depositRub !== undefined ? rubToKopecks(tendersInput.depositRub) : 0;
	const familyKop = tendersInput.familyWalletRub !== undefined ? rubToKopecks(tendersInput.familyWalletRub) : 0;
	const certKop = tendersInput.certificateRub !== undefined ? rubToKopecks(tendersInput.certificateRub) : 0;

	// Списание подарочного сертификата и депозита — 54-ФЗ Тег 1215 (Зачет аванса)
	const tag1215AdvanceKop = depositKop + familyKop + certKop;
	// Безналичные платежи — 54-ФЗ Тег 1081 (Карта + СБП QR)
	const tag1081ElectronicKop = cardKop + sbpKop;

	const totalAllocatedKop = cashKop + tag1081ElectronicKop + tag1215AdvanceKop;
	const remainingKop = totalKopecks - totalAllocatedKop;

	const receivedCashKop =
		tendersInput.receivedCashRub !== undefined
			? rubToKopecks(tendersInput.receivedCashRub)
			: cashKop;
	const changeKop = Math.max(0, receivedCashKop - cashKop);

	const tenders: MixedReceiptTendersResult = {
		cashKopecks: cashKop,
		cashRub: kopecksToRub(cashKop),
		receivedCashKopecks: receivedCashKop,
		receivedCashRub: kopecksToRub(receivedCashKop),
		changeKopecks: changeKop,
		changeRub: kopecksToRub(changeKop),
		cardKopecks: cardKop,
		cardRub: kopecksToRub(cardKop),
		sbpKopecks: sbpKop,
		sbpRub: kopecksToRub(sbpKop),
		totalElectronicKopecks: tag1081ElectronicKop,
		totalElectronicRub: kopecksToRub(tag1081ElectronicKop),
		depositKopecks: depositKop,
		depositRub: kopecksToRub(depositKop),
		familyWalletKopecks: familyKop,
		familyWalletRub: kopecksToRub(familyKop),
		certificateKopecks: certKop,
		certificateRub: kopecksToRub(certKop),
		tag1215AdvanceOffsetKopecks: tag1215AdvanceKop,
		tag1215AdvanceOffsetRub: kopecksToRub(tag1215AdvanceKop),
		totalAllocatedKopecks: totalAllocatedKop,
		totalAllocatedRub: kopecksToRub(totalAllocatedKop),
		remainingKopecks: remainingKop,
		remainingRub: kopecksToRub(remainingKop),
		isFullyAllocated: remainingKop === 0 && totalKopecks > 0,
		isOverallocated: remainingKop < 0,
	};

	return {
		items: compiledItems,
		totals,
		tenders,
		ofdVerificationPayload: {
			totalRubFormatted: kopecksToNumericString(totalKopecks),
			vat20RubFormatted: kopecksToNumericString(vat20Kopecks),
			vatNoneRubFormatted: kopecksToNumericString(vatNoneKopecks),
			tag1031_cashRub: kopecksToNumericString(cashKop),
			tag1081_electronicRub: kopecksToNumericString(tag1081ElectronicKop),
			tag1215_prepaidAdvanceOffsetRub: kopecksToNumericString(tag1215AdvanceKop),
		},
	};
}
