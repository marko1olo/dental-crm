/**
 * apps/web/src/components/billing/billingCatalogData.ts
 *
 * Canonical SSOT Data Catalog, Reference Presets & Integer Math for DENTE Billing & Cashbox.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft-focus defaults, 100% warranty).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (0 forced citizen INN for physical persons).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - Apple HIG: Structured domain models for touch targets >= 44x44px.
 * - Sweet Spot target: 250-350 lines.
 */

export type BillingPaymentMethod =
	| "cash"
	| "card"
	| "sbp"
	| "deposit"
	| "certificate"
	| "split"
	| "warranty";

export type BillingVatRate = "vat_none" | "vat_20" | "vat_10" | "vat_0";

export type BillingClientPayerType =
	| "physical_person"
	| "legal_entity"
	| "sole_proprietor";

export type BillingReceiptDeliveryChannel =
	| "print"
	| "sms"
	| "email"
	| "electronic_only";

export type BillingReceiptPrintFormat = "tape_80mm" | "tape_58mm" | "act_a4";

export interface BillingPaymentMethodPreset {
	readonly id: BillingPaymentMethod;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly isInstant: boolean;
	readonly testId: string;
}

export interface BillingVatRatePreset {
	readonly id: BillingVatRate;
	readonly code: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly ratePercent: number;
	readonly legalBasis: string;
}

export interface BillingPayerTypePreset {
	readonly id: BillingClientPayerType;
	readonly label: string;
	readonly isInnRequired: boolean;
	readonly innLength?: 10 | 12;
	readonly helperText: string;
}

export interface BillingDoctorDiscountPreset {
	readonly percent: number;
	readonly label: string;
	readonly isWarranty?: boolean;
}

export interface BillingCashDenomination {
	readonly nominalRub: number;
	readonly nominalKopecks: bigint;
	readonly label: string;
}

export interface SplitValidationResult {
	readonly totalDueKopecks: bigint;
	readonly allocatedKopecks: bigint;
	readonly remainingKopecks: bigint;
	readonly isFullyAllocated: boolean;
	readonly isOverAllocated: boolean;
	readonly diffRubles: number;
}

export interface CashChangeResult {
	readonly requiredKopecks: bigint;
	readonly tenderedKopecks: bigint;
	readonly changeKopecks: bigint;
	readonly changeRubles: number;
	readonly isShortage: boolean;
	readonly shortageKopecks: bigint;
	readonly shortageRubles: number;
}

// ============================================================================
// 1. EXACT INTEGER KOPECK ARITHMETIC HELPERS (ZERO FLOAT DRIFT)
// ============================================================================

/** Convert rubles (float or int) to integer kopecks safely as BigInt */
export function rublesToKopecks(rubles: number): bigint {
	if (!Number.isFinite(rubles) || rubles <= 0) return 0n;
	return BigInt(Math.round(rubles * 100));
}

/** Convert BigInt or number kopecks to float rubles */
export function kopecksToRubles(kopecks: bigint | number): number {
	const kop = typeof kopecks === "bigint" ? Number(kopecks) : kopecks;
	if (!Number.isFinite(kop) || kop <= 0) return 0;
	return kop / 100;
}

/** Format kopecks to Russian currency string (e.g. "4 500 ₽" or "4 500,50 ₽") */
export function formatKopecks(kopecks: bigint | number): string {
	const rub = kopecksToRubles(kopecks);
	return formatRubles(rub);
}

/** Format rubles to clean Russian currency string */
export function formatRubles(rubles: number): string {
	const isInteger = Math.round(rubles * 100) % 100 === 0;
	return new Intl.NumberFormat("ru-RU", {
		minimumFractionDigits: isInteger ? 0 : 2,
		maximumFractionDigits: 2,
	}).format(rubles) + " ₽";
}

/** Validate split tender breakdown against total bill */
export function validateSplitAllocation(
	totalDueKopecks: bigint,
	allocations: Record<string, bigint | number>,
): SplitValidationResult {
	let allocated = 0n;
	for (const key of Object.keys(allocations)) {
		const val = allocations[key];
		const kop = typeof val === "bigint" ? val : BigInt(Math.max(0, Math.round(Number(val) || 0)));
		if (kop > 0n) allocated += kop;
	}

	const remaining = totalDueKopecks - allocated;
	const isFullyAllocated = remaining === 0n;
	const isOverAllocated = remaining < 0n;
	const diffRubles = kopecksToRubles(remaining < 0n ? -remaining : remaining);

	return {
		totalDueKopecks,
		allocatedKopecks: allocated,
		remainingKopecks: remaining,
		isFullyAllocated,
		isOverAllocated,
		diffRubles,
	};
}

/** Calculate change or shortage for cash tender */
export function calculateCashChangeKopecks(
	requiredKopecks: bigint,
	tenderedKopecks: bigint,
): CashChangeResult {
	const req = requiredKopecks < 0n ? 0n : requiredKopecks;
	const ten = tenderedKopecks < 0n ? 0n : tenderedKopecks;

	if (ten >= req) {
		const changeKopecks = ten - req;
		return {
			requiredKopecks: req,
			tenderedKopecks: ten,
			changeKopecks,
			changeRubles: kopecksToRubles(changeKopecks),
			isShortage: false,
			shortageKopecks: 0n,
			shortageRubles: 0,
		};
	}

	const shortageKopecks = req - ten;
	return {
		requiredKopecks: req,
		tenderedKopecks: ten,
		changeKopecks: 0n,
		changeRubles: 0,
		isShortage: true,
		shortageKopecks,
		shortageRubles: kopecksToRubles(shortageKopecks),
	};
}

/** Quick cash tender presets: exact total + smart rounded denominations */
export function getQuickCashTenderOptions(totalDueRub: number): readonly number[] {
	if (totalDueRub <= 0) return [1000, 2000, 5000];
	const exact = Math.ceil(totalDueRub);
	const round100 = Math.ceil(exact / 100) * 100;
	const round500 = Math.ceil(exact / 500) * 500;
	const round1000 = Math.ceil(exact / 1000) * 1000;
	const round5000 = Math.ceil(exact / 5000) * 5000;

	const set = new Set<number>([exact]);
	if (round100 > exact) set.add(round100);
	if (round500 > exact) set.add(round500);
	if (round1000 > exact) set.add(round1000);
	if (round5000 > exact) set.add(round5000);

	// Add common Russian bills if larger than total
	for (const bill of [1000, 2000, 5000]) {
		if (bill >= exact) set.add(bill);
	}

	return Array.from(set).sort((a, b) => a - b).slice(0, 5);
}

// ============================================================================
// 2. CANONICAL CATALOG PRESETS
// ============================================================================

/** Canonical payment methods in clean clinical Russian */
export const BILLING_PAYMENT_METHODS: readonly BillingPaymentMethodPreset[] = [
	{
		id: "cash",
		label: "Наличные",
		shortLabel: "Наличные",
		description: "Приём наличных рублей с автоматическим расчётом сдачи",
		isInstant: true,
		testId: "btn-tender-cash",
	},
	{
		id: "card",
		label: "Банковская карта",
		shortLabel: "Карта",
		description: "Оплата банковской картой через POS-терминал клиники",
		isInstant: true,
		testId: "btn-tender-card",
	},
	{
		id: "sbp",
		label: "СБП по QR-коду",
		shortLabel: "СБП QR",
		description: "Мгновенный перевод через Систему быстрых платежей (НСПК)",
		isInstant: false,
		testId: "btn-tender-sbp",
	},
	{
		id: "deposit",
		label: "Семейный баланс / депозит",
		shortLabel: "Депозит",
		description: "Списание средств с личного аванса или семейного кошелька",
		isInstant: true,
		testId: "btn-tender-deposit",
	},
	{
		id: "certificate",
		label: "Подарочный сертификат",
		shortLabel: "Сертификат",
		description: "Зачёт номинала подарочного или корпоративного сертификата",
		isInstant: true,
		testId: "btn-tender-certificate",
	},
	{
		id: "split",
		label: "Сплит-оплата",
		shortLabel: "Сплит",
		description: "Комбинированная оплата (нал + карта + СБП + депозит)",
		isInstant: false,
		testId: "btn-tender-split",
	},
];

/** Standard Russian Banknote Denominations */
export const BILLING_CASH_DENOMINATIONS: readonly BillingCashDenomination[] = [
	{ nominalRub: 100, nominalKopecks: 10000n, label: "100 ₽" },
	{ nominalRub: 200, nominalKopecks: 20000n, label: "200 ₽" },
	{ nominalRub: 500, nominalKopecks: 50000n, label: "500 ₽" },
	{ nominalRub: 1000, nominalKopecks: 100000n, label: "1 000 ₽" },
	{ nominalRub: 2000, nominalKopecks: 200000n, label: "2 000 ₽" },
	{ nominalRub: 5000, nominalKopecks: 500000n, label: "5 000 ₽" },
];

/** Quick 1-click cash bill insertion presets */
export const BILLING_QUICK_BILLS: readonly number[] = [1000, 2000, 5000];

/** Fiscal VAT Rates according to Russian Tax Code */
export const BILLING_VAT_RATES: readonly BillingVatRatePreset[] = [
	{
		id: "vat_none",
		code: 6,
		label: "Без НДС (Медицинские услуги)",
		shortLabel: "Без НДС",
		ratePercent: 0,
		legalBasis: "пп. 2 п. 2 ст. 149 НК РФ (льгота на медицинские услуги)",
	},
	{
		id: "vat_20",
		code: 1,
		label: "НДС 20% (Для организаций и ДМС)",
		shortLabel: "НДС 20%",
		ratePercent: 20,
		legalBasis: "Стандартная ставка для корпоративных заказчиков",
	},
	{
		id: "vat_10",
		code: 2,
		label: "НДС 10% (Медицинские изделия)",
		shortLabel: "НДС 10%",
		ratePercent: 10,
		legalBasis: "Льготная ставка на специализированные медизделия",
	},
	{
		id: "vat_0",
		code: 5,
		label: "НДС 0%",
		shortLabel: "НДС 0%",
		ratePercent: 0,
		legalBasis: "Нулевая налоговая ставка",
	},
];

/** Doctor and Cashier Autonomy Discount Presets (Mandate 8e) */
export const BILLING_DOCTOR_DISCOUNTS: readonly BillingDoctorDiscountPreset[] = [
	{ percent: 0, label: "0% (Без скидки)" },
	{ percent: 5, label: "5%" },
	{ percent: 10, label: "10%" },
	{ percent: 15, label: "15%" },
	{ percent: 20, label: "20%" },
	{ percent: 50, label: "50%" },
	{ percent: 100, label: "100% Гарантия врача", isWarranty: true },
];

/**
 * Payer Classification (Mandate 8n).
 * ABSOLUTE INVARIANT: Physical persons NEVER have forced INN requirements!
 */
export const BILLING_PAYER_TYPES: readonly BillingPayerTypePreset[] = [
	{
		id: "physical_person",
		label: "Физическое лицо (Пациент)",
		isInnRequired: false,
		helperText: "ИНН не требуется. Фискальный кассовый чек формируется автоматически.",
	},
	{
		id: "legal_entity",
		label: "Юридическое лицо (ООО / АО / ДМС)",
		isInnRequired: true,
		innLength: 10,
		helperText: "Требуется ИНН организации (10 цифр) для безналичного расчёта.",
	},
	{
		id: "sole_proprietor",
		label: "Индивидуальный предприниматель (ИП)",
		isInnRequired: true,
		innLength: 12,
		helperText: "Требуется ИНН предпринимателя (12 цифр).",
	},
];

/** Formats for printing receipts and acts */
export const BILLING_PRINT_FORMATS = [
	{ id: "tape_80mm" as const, label: "Кассовая лента 80 мм", description: "Стандартный термочек кассы" },
	{ id: "tape_58mm" as const, label: "Компактная лента 58 мм", description: "Узкая чековая термолента" },
	{ id: "act_a4" as const, label: "Акт услуг А4", description: "Полноформатный акт оказанных услуг" },
];

/** Standard showcase demo invoice for testing and visual proofs */
export function getBillingDemoInvoice() {
	return {
		id: "inv-demo-studio",
		patientId: "pat-demo-studio",
		patientName: "Воронова Светлана Николаевна",
		patientPhone: "+7 (926) 555-01-92",
		doctorName: "Смирнов Алексей Владимирович",
		serviceTitle: "Лечение глубокого кариеса 46 зуба, композит светового отверждения",
		amountRub: 7500,
		amountKopecks: 750000n,
		depositRub: 2500,
		depositKopecks: 250000n,
		familyBalanceRub: 2500,
	};
}
