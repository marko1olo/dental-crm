/**
 * apps/web/src/components/cashbox/cashRegisterCatalogData.ts
 *
 * Canonical SSOT Data Catalog & Integer Kopeck Finance Engine for DENTE Cash Register & 54-FZ POS.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft-focus defaults, 100% warranty).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN, 1-click tender split).
 * - Mandate 8am: Single Primary CTA (#0d9488) design-system tokens.
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - Sweet Spot size: 280-350 lines.
 */

export type CashboxTenderType = "card" | "cash" | "sbp" | "deposit" | "split" | "warranty";
export type ClientPayerType = "physical_person" | "legal_entity" | "sole_proprietor";
export type ReceiptDeliveryChannel = "print" | "sms" | "email" | "electronic_only";
export type ReceiptPrintFormat = "tape_58mm" | "tape_80mm" | "act_a4";
export type CashRegisterStudioTab = "checkout" | "shift" | "tape";

export interface CashboxTenderPreset {
	readonly id: CashboxTenderType;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly isInstant: boolean;
	readonly testId: string;
}

export interface CashDenominationBill {
	readonly nominalRub: number;
	readonly nominalKopecks: number;
	readonly label: string;
}

export interface SplitPresetOption {
	readonly id: "50-50" | "deposit-card" | "deposit-cash" | "card-sbp";
	readonly title: string;
	readonly subtitle: string;
}

export interface DoctorDiscountPreset {
	readonly percent: number;
	readonly label: string;
	readonly isWarranty?: boolean;
}

export interface PayerTypePreset {
	readonly id: ClientPayerType;
	readonly label: string;
	readonly isInnRequired: boolean;
	readonly innLength?: 10 | 12;
	readonly helperText: string;
}

export interface DiscrepancyReasonOption {
	readonly code: string;
	readonly label: string;
	readonly description: string;
}

export interface CashChangeResult {
	readonly receivedRub: number;
	readonly totalDueRub: number;
	readonly changeRub: number;
	readonly changeKopecks: bigint;
	readonly isExact: boolean;
	readonly isShortage: boolean;
	readonly isSurplus: boolean;
	readonly formattedChange: string;
}

/* ========================================================================= */
/* 1. EXACT INTEGER KOPECK FINANCIAL HELPERS (ZERO FLOAT DRIFT)              */
/* ========================================================================= */

/** Safely converts rubles to exact integer BigInt kopecks */
export function rubToKopecks(rub: number): bigint {
	if (!Number.isFinite(rub) || rub <= 0) return 0n;
	return BigInt(Math.round(rub * 100));
}

/** Converts integer kopecks to float rubles for display */
export function kopecksToRub(kopecks: bigint | number): number {
	const kop = typeof kopecks === "bigint" ? Number(kopecks) : kopecks;
	return Math.round(kop) / 100;
}

/** Formats integer kopecks into clean Russian rubles: "15 400 ₽" or "15 400,50 ₽" */
export function formatKopecksToRubles(kopecks: bigint | number): string {
	const rub = kopecksToRub(kopecks);
	return formatRubles(rub);
}

/** Formats rubles with Russian non-breaking thousand separators and currency symbol */
export function formatRubles(rub: number): string {
	if (!Number.isFinite(rub)) return "0 ₽";
	const rounded = Math.round(rub * 100) / 100;
	const parts = rounded.toFixed(rounded % 1 === 0 ? 0 : 2).split(".");
	const integerPart = (parts[0] ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	return parts.length > 1 ? `${integerPart},${parts[1]} ₽` : `${integerPart} ₽`;
}

/**
 * Calculates cash change with exact integer precision and status indicators.
 */
export function calculateExactCashChange(receivedRub: number, totalDueRub: number): CashChangeResult {
	const receivedKop = rubToKopecks(receivedRub);
	const dueKop = rubToKopecks(totalDueRub);
	const diffKop = receivedKop - dueKop;

	const isExact = diffKop === 0n;
	const isShortage = diffKop < 0n;
	const isSurplus = diffKop > 0n;
	const changeKop = isSurplus ? diffKop : 0n;
	const changeRub = kopecksToRub(changeKop);

	return {
		receivedRub,
		totalDueRub,
		changeRub,
		changeKopecks: changeKop,
		isExact,
		isShortage,
		isSurplus,
		formattedChange: formatKopecksToRubles(changeKop),
	};
}

/* ========================================================================= */
/* 2. CANONICAL PRESETS AND CATALOG DATA                                     */
/* ========================================================================= */

/**
 * Canonical 5 Payment Tenders: 0 raw regulatory jargon, 0 cartoon emojis.
 */
export const CASHBOX_TENDER_PRESETS: readonly CashboxTenderPreset[] = [
	{
		id: "card",
		label: "Банковская карта",
		shortLabel: "Карта",
		description: "Оплата через POS-терминал клиники",
		isInstant: true,
		testId: "tender-method-card",
	},
	{
		id: "cash",
		label: "Наличные",
		shortLabel: "Наличные",
		description: "Приём наличных с авторасчётом сдачи",
		isInstant: true,
		testId: "tender-method-cash",
	},
	{
		id: "sbp",
		label: "СБП по QR-коду",
		shortLabel: "СБП QR",
		description: "Мгновенный перевод через Систему быстрых платежей",
		isInstant: false,
		testId: "tender-method-sbp",
	},
	{
		id: "deposit",
		label: "Аванс / депозит",
		shortLabel: "Депозит",
		description: "Списание с личного или семейного баланса",
		isInstant: true,
		testId: "tender-method-deposit",
	},
	{
		id: "split",
		label: "Сплит / раздельно",
		shortLabel: "Сплит",
		description: "Разделение чека на несколько источников оплаты",
		isInstant: false,
		testId: "tender-method-split",
	},
];

/** Standard Russian Banknote Denominations for Cash Drawer & 1-Click Change */
export const CASH_DENOMINATIONS: readonly CashDenominationBill[] = [
	{ nominalRub: 100, nominalKopecks: 10000, label: "100 ₽" },
	{ nominalRub: 200, nominalKopecks: 20000, label: "200 ₽" },
	{ nominalRub: 500, nominalKopecks: 50000, label: "500 ₽" },
	{ nominalRub: 1000, nominalKopecks: 100000, label: "1 000 ₽" },
	{ nominalRub: 2000, nominalKopecks: 200000, label: "2 000 ₽" },
	{ nominalRub: 5000, nominalKopecks: 500000, label: "5 000 ₽" },
];

/** Quick 1-Click Cash Insertion Buttons: 1000 ₽, 2000 ₽, 5000 ₽ */
export const QUICK_CASH_PRESET_BILLS: readonly number[] = [1000, 2000, 5000];

/** Studio Quick Bills (Mandate 8e/8n): 500 ₽, 1000 ₽, 5000 ₽ */
export const CASH_STUDIO_QUICK_BILLS: readonly number[] = [500, 1000, 5000];

/** Doctor & Cashier Autonomous Discount Presets (Mandate 8e) */
export const DOCTOR_DISCOUNT_PRESETS: readonly DoctorDiscountPreset[] = [
	{ percent: 0, label: "0% (Без скидки)" },
	{ percent: 5, label: "5%" },
	{ percent: 10, label: "10%" },
	{ percent: 15, label: "15%" },
	{ percent: 20, label: "20%" },
	{ percent: 50, label: "50%" },
	{ percent: 100, label: "100% Гарантия врача", isWarranty: true },
];

/** Split Payment Quick Allocation Presets */
export const SPLIT_PAYMENT_PRESETS: readonly SplitPresetOption[] = [
	{ id: "50-50", title: "50 / 50", subtitle: "Поровну: карта + наличные" },
	{ id: "deposit-card", title: "Депозит + Карта", subtitle: "Сначала баланс, остаток картой" },
	{ id: "deposit-cash", title: "Депозит + Нал", subtitle: "Сначала баланс, остаток наличными" },
	{ id: "card-sbp", title: "Карта + СБП", subtitle: "Часть картой, часть по QR" },
];

/**
 * Payer / Client Classification (Mandate 8n).
 * CRITICAL LAW: Physical persons NEVER have forced INN requirements!
 */
export const PAYER_TYPE_PRESETS: readonly PayerTypePreset[] = [
	{
		id: "physical_person",
		label: "Физическое лицо",
		isInnRequired: false,
		helperText: "ИНН не требуется. Фискальный чек формируется автоматически.",
	},
	{
		id: "legal_entity",
		label: "Юридическое лицо (ООО/АО)",
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

/** Receipt & Act Document Formats */
export const RECEIPT_PRINT_FORMATS = [
	{ id: "tape_80mm" as const, label: "Кассовая лента 80 мм", description: "Стандартный термочек" },
	{ id: "tape_58mm" as const, label: "Компактная лента 58 мм", description: "Узкая чековая лента" },
	{ id: "act_a4" as const, label: "Акт услуг А4", description: "Полноформатный акт оказанных услуг" },
];

/** Shift Closing Discrepancy Reasons for Audit & Reconciliation */
export const SHIFT_DISCREPANCY_REASONS: readonly DiscrepancyReasonOption[] = [
	{ code: "none", label: "Без расхождений", description: "Фактическая наличность полностью совпадает" },
	{ code: "change_mistake", label: "Ошибка при сдаче", description: "Неточность при выдаче сдачи" },
	{ code: "emergency_expense", label: "Хозяйственный расход", description: "Внеплановое списание" },
	{ code: "rounding_drift", label: "Округление копеек", description: "Копеечное расхождение" },
	{ code: "technical_defect", label: "Сбой регистратора", description: "Аппаратное замятие ленты" },
];

/** Returns demo fallback queue of unpaid invoices for showcase mode */
export function getDemoUnpaidInvoices() {
	return [
		{
			id: "inv-demo-101",
			patientId: "pat-demo-01",
			patientName: "Воронова Светлана Николаевна",
			patientPhone: "+7 (926) 555-01-92",
			doctorName: "Смирнов А. В.",
			serviceTitle: "Лечение кариеса 46 зуба, световой композит",
			amountRub: 4500,
			amountKopecks: 450000,
			depositRub: 1500,
			familyBalanceRub: 1200,
			createdAt: "Сегодня, 10:45",
		},
		{
			id: "inv-demo-102",
			patientId: "pat-demo-02",
			patientName: "Кузнецов Игорь Павлович",
			patientPhone: "+7 (916) 444-22-11",
			doctorName: "Васильева Е. М.",
			serviceTitle: "Профессиональная гигиена полости рта Air-Flow",
			amountRub: 6800,
			amountKopecks: 680000,
			depositRub: 0,
			familyBalanceRub: 0,
			createdAt: "Сегодня, 11:15",
		},
	];
}

/** Generates monospaced 54-FZ thermal receipt tape text for preview */
export function generateFiscalTapeText(params: {
	shiftNumber: number;
	cashierFullName: string;
	kktRegNumber?: string;
	ofdName?: string;
	netRevenueRub?: number;
	cashInDrawerRub?: number;
	cardSumRub?: number;
	sbpSumRub?: number;
	advanceOffsetRub?: number;
	width?: "tape_80mm" | "tape_58mm";
}): string {
	const w = params.width === "tape_58mm" ? 32 : 42;
	const div = "=".repeat(w);
	const line = "-".repeat(w);
	const pad = (left: string, right: string) => {
		const space = Math.max(1, w - left.length - right.length);
		return `${left}${" ".repeat(space)}${right}`;
	};

	return [
		div,
		"        ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		"        КАССОВЫЙ ЧЕК / СМЕННЫЙ ОТЧЕТ",
		div,
		pad("ККТ Рег. №:", params.kktRegNumber || "0004829104058291"),
		pad("ОФД:", params.ofdName || "АО «ПЕРВЫЙ ОФД»"),
		pad("Смена №:", String(params.shiftNumber)),
		pad("Кассир:", params.cashierFullName),
		line,
		pad("НАЛИЧНЫЕ:", formatRubles(params.cashInDrawerRub ?? 15000)),
		pad("БЕЗНАЛ / КАРТЫ:", formatRubles(params.cardSumRub ?? 35000)),
		pad("СБП QR:", formatRubles(params.sbpSumRub ?? 7000)),
		pad("ЗАЧЕТ АВАНСА:", formatRubles(params.advanceOffsetRub ?? 2000)),
		line,
		pad("ИТОГО ВЫРУЧКА:", formatRubles(params.netRevenueRub ?? 59000)),
		pad("ФН / ФД / ФПД:", "99990789 / 000104 / 389104821"),
		div,
		"       СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ!",
		div,
	].join("\n");
}
