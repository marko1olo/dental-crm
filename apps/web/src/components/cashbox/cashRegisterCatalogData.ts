/**
 * apps/web/src/components/cashbox/cashRegisterCatalogData.ts
 *
 * Canonical SSOT Data Catalog & Integer Kopeck Finance Engine for DENTE Cash Register & POS.
 * Governed by Mandates 8e, 8n, 8am, 8bf, 8bm.
 */

import {
	rublesToKopecks,
	kopecksToRubles,
	formatRubles,
	formatKopecksToRub,
} from "@dental/shared";

export type CashboxTenderType = "card" | "cash" | "sbp" | "deposit" | "split" | "warranty" | "installment" | "certificate" | "insurance";
export type ClientPayerType = "physical_person" | "legal_entity" | "sole_proprietor";
export type ReceiptDeliveryChannel = "print" | "sms" | "email" | "electronic_only";
export type ReceiptPrintFormat = "tape_58mm" | "tape_80mm" | "act_a4";
export type CashRegisterStudioTab = "checkout" | "shift" | "tape";

export const OFD_UNCONFIGURED_LABEL = "ОФД не настроен";
export const KKT_UNCONFIGURED_LABEL = "Не подключен";

const OFD_PROVIDER_LABELS: Readonly<Record<string, string>> = {
	platforma_ofd: "Платформа ОФД",
	first_ofd: "Первый ОФД",
	taxcom: "Такском ОФД",
	sbis: "СБИС (Тензор)",
	kontur_ofd: "Контур ОФД",
};

export function resolveOfdDisplayName(providerOrName?: string | null): string {
	const trimmed = typeof providerOrName === "string" ? providerOrName.trim() : "";
	if (!trimmed) return OFD_UNCONFIGURED_LABEL;
	return OFD_PROVIDER_LABELS[trimmed] ?? trimmed;
}

export function toKopecksBigInt(
	kopecks?: bigint | number | string | null,
	legacyRub?: number | null,
): bigint {
	if (typeof kopecks === "bigint") return kopecks > 0n ? kopecks : 0n;
	if (typeof kopecks === "number" && Number.isFinite(kopecks)) {
		const rounded = Math.round(kopecks);
		return rounded > 0 ? BigInt(rounded) : 0n;
	}
	if (typeof kopecks === "string" && /^\d+$/.test(kopecks.trim())) {
		return BigInt(kopecks.trim());
	}
	if (typeof legacyRub === "number" && Number.isFinite(legacyRub) && legacyRub > 0) {
		return BigInt(rublesToKopecks(legacyRub));
	}
	return 0n;
}

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
	readonly isWarranty?: boolean | undefined;
}

export interface PayerTypePreset {
	readonly id: ClientPayerType;
	readonly label: string;
	readonly isInnRequired: boolean;
	readonly innLength?: (10 | 12) | undefined;
	readonly helperText: string;
}

export interface DiscrepancyReasonOption {
	readonly code: string;
	readonly label: string;
	readonly description: string;
}

export interface CashChangeResult {
	readonly receivedKopecks: bigint;
	readonly totalDueKopecks: bigint;
	readonly changeKopecks: bigint;
	readonly receivedRub: number;
	readonly totalDueRub: number;
	readonly changeRub: number;
	readonly isExact: boolean;
	readonly isShortage: boolean;
	readonly isSurplus: boolean;
	readonly formattedChange: string;
	readonly formattedShortage: string;
}

/* ========================================================================= */
/* 1. EXACT INTEGER KOPECK FINANCIAL HELPERS (ZERO FLOAT DRIFT)              */
/* ========================================================================= */

/** Safely converts rubles to exact integer BigInt kopecks via canonical @dental/shared */
export function rubToKopecks(rub: number): bigint {
	if (!Number.isFinite(rub) || rub <= 0) return 0n;
	return BigInt(rublesToKopecks(rub));
}

/** Converts integer kopecks to rubles via canonical @dental/shared */
export function kopecksToRub(kopecks: bigint | number): number {
	const kop = typeof kopecks === "bigint" ? Number(kopecks) : kopecks;
	return kopecksToRubles(kop);
}

/** Formats integer kopecks into clean Russian rubles via canonical @dental/shared */
export function formatKopecksToRubles(kopecks: bigint | number): string {
	return formatKopecksToRub(kopecks);
}

/** Canonical integer kopeck helpers re-exported from @dental/shared SSOT (Mandates 8b, 8bf) */
export { formatRubles, formatKopecksToRub, rublesToKopecks, kopecksToRubles };

/**
 * Calculates cash change directly in BigInt kopecks without float drift.
 */
export function calculateExactCashChangeKopecks(
	receivedKop: bigint,
	dueKop: bigint,
): CashChangeResult {
	const safeReceived = receivedKop > 0n ? receivedKop : 0n;
	const safeDue = dueKop > 0n ? dueKop : 0n;
	const diffKop = safeReceived - safeDue;

	const isExact = diffKop === 0n;
	const isShortage = diffKop < 0n;
	const isSurplus = diffKop > 0n;
	const changeKop = isSurplus ? diffKop : 0n;
	const shortageKop = isShortage ? -diffKop : 0n;

	return {
		receivedKopecks: safeReceived,
		totalDueKopecks: safeDue,
		changeKopecks: changeKop,
		receivedRub: kopecksToRub(safeReceived),
		totalDueRub: kopecksToRub(safeDue),
		changeRub: kopecksToRub(changeKop),
		isExact,
		isShortage,
		isSurplus,
		formattedChange: formatKopecksToRubles(changeKop),
		formattedShortage: formatKopecksToRubles(shortageKop),
	};
}

/**
 * Legacy-signature wrapper routing through calculateExactCashChangeKopecks.
 */
export function calculateExactCashChange(receivedRub: number, totalDueRub: number): CashChangeResult {
	return calculateExactCashChangeKopecks(rubToKopecks(receivedRub), rubToKopecks(totalDueRub));
}

/* ========================================================================= */
/* 2. CANONICAL PRESETS AND CATALOG DATA                                     */
/* ========================================================================= */

export const CASHBOX_TENDER_PRESETS: readonly CashboxTenderPreset[] = [
	{ id: "cash", label: "Наличные", shortLabel: "Наличные", description: "Приём наличных с авторасчётом сдачи", isInstant: true, testId: "tender-method-cash" },
	{ id: "card", label: "Терминал (Карта)", shortLabel: "Карта", description: "Оплата банковской картой через POS-терминал", isInstant: true, testId: "tender-method-card" },
	{ id: "sbp", label: "СБП QR", shortLabel: "СБП QR", description: "Оплата по динамическому QR-коду СБП телефоном", isInstant: false, testId: "tender-method-sbp" },
	{ id: "installment", label: "Рассрочка", shortLabel: "Рассрочка", description: "Банковская рассрочка 0% без переплаты", isInstant: false, testId: "tender-method-installment" },
	{ id: "warranty", label: "Гарантия 100% (0 ₽)", shortLabel: "Гарантия 100%", description: "Гарантийная переделка врача без фискализации чека", isInstant: true, testId: "tender-method-warranty" },
	{ id: "split", label: "Сплит-оплата", shortLabel: "Сплит", description: "Разделение чека на несколько источников оплаты", isInstant: false, testId: "tender-method-split" },
	{ id: "deposit", label: "Депозит / аванс", shortLabel: "Депозит", description: "Списание с личного или семейного баланса", isInstant: true, testId: "tender-method-deposit" },
	{ id: "certificate", label: "Подарочный сертификат", shortLabel: "Сертификат", description: "Оплата сертификатом клиники с проверкой номера Luhn-16", isInstant: false, testId: "tender-method-certificate" },
];

export const CASH_DENOMINATIONS: readonly CashDenominationBill[] = [
	{ nominalRub: 100, nominalKopecks: 10000, label: "100 ₽" },
	{ nominalRub: 200, nominalKopecks: 20000, label: "200 ₽" },
	{ nominalRub: 500, nominalKopecks: 50000, label: "500 ₽" },
	{ nominalRub: 1000, nominalKopecks: 100000, label: "1 000 ₽" },
	{ nominalRub: 2000, nominalKopecks: 200000, label: "2 000 ₽" },
	{ nominalRub: 5000, nominalKopecks: 500000, label: "5 000 ₽" },
];

export const QUICK_CASH_PRESET_BILLS: readonly number[] = [1000, 2000, 5000];
export const CASH_STUDIO_QUICK_BILLS: readonly number[] = [500, 1000, 5000];

export const DOCTOR_DISCOUNT_PRESETS: readonly DoctorDiscountPreset[] = [
	{ percent: 0, label: "0% (Без скидки)" },
	{ percent: 5, label: "5%" },
	{ percent: 10, label: "10%" },
	{ percent: 15, label: "15%" },
	{ percent: 20, label: "20%" },
	{ percent: 50, label: "50%" },
	{ percent: 100, label: "100% Гарантия врача", isWarranty: true },
];

export const SPLIT_PAYMENT_PRESETS: readonly SplitPresetOption[] = [
	{ id: "50-50", title: "50 / 50", subtitle: "Поровну: карта + наличные" },
	{ id: "deposit-card", title: "Депозит + Карта", subtitle: "Сначала баланс, остаток картой" },
	{ id: "deposit-cash", title: "Депозит + Нал", subtitle: "Сначала баланс, остаток наличными" },
	{ id: "card-sbp", title: "Карта + СБП", subtitle: "Часть картой, часть по QR" },
];

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

export const RECEIPT_PRINT_FORMATS = [
	{ id: "tape_80mm" as const, label: "Кассовая лента 80 мм", description: "Стандартный термочек" },
	{ id: "tape_58mm" as const, label: "Компактная лента 58 мм", description: "Узкая чековая лента" },
	{ id: "act_a4" as const, label: "Акт услуг А4", description: "Полноформатный акт оказанных услуг" },
];

export const SHIFT_DISCREPANCY_REASONS: readonly DiscrepancyReasonOption[] = [
	{ code: "none", label: "Без расхождений", description: "Фактическая наличность полностью совпадает" },
	{ code: "change_mistake", label: "Ошибка при сдаче", description: "Неточность при выдаче сдачи" },
	{ code: "emergency_expense", label: "Хозяйственный расход", description: "Внеплановое списание" },
	{ code: "rounding_drift", label: "Округление копеек", description: "Копеечное расхождение" },
	{ code: "technical_defect", label: "Сбой регистратора", description: "Аппаратное замятие ленты" },
];

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

export interface FiscalTapeOperationItem {
	readonly id?: string | undefined;
	readonly operationType?: string | undefined;
	readonly amountKopecks?: bigint | number | string | undefined;
	/** @deprecated Legacy ruble fallback */
	readonly amountRub?: number | undefined;
	readonly reasonText?: string | null | undefined;
	readonly createdAt?: string | undefined;
}

/** Generates monospaced thermal receipt tape text for preview */
export function generateFiscalTapeText(params: {
	shiftNumber: number;
	cashierFullName: string;
	clinicLegalName?: string | undefined;
	kktRegNumber?: string | undefined;
	ofdName?: string | undefined;
	netRevenueKopecks?: bigint | number | undefined;
	cashInDrawerKopecks?: bigint | number | undefined;
	cardSumKopecks?: bigint | number | undefined;
	sbpSumKopecks?: bigint | number | undefined;
	advanceOffsetKopecks?: bigint | number | undefined;
	/** @deprecated Legacy ruble fallback */
	netRevenueRub?: number | undefined;
	/** @deprecated Legacy ruble fallback */
	cashInDrawerRub?: number | undefined;
	/** @deprecated Legacy ruble fallback */
	cardSumRub?: number | undefined;
	/** @deprecated Legacy ruble fallback */
	sbpSumRub?: number | undefined;
	/** @deprecated Legacy ruble fallback */
	advanceOffsetRub?: number | undefined;
	operations?: readonly FiscalTapeOperationItem[] | undefined;
	width?: "tape_80mm" | "tape_58mm" | undefined;
}): string {
	const w = params.width === "tape_58mm" ? 32 : 42;
	const div = "=".repeat(w);
	const line = "-".repeat(w);
	const pad = (left: string, right: string) => {
		const space = Math.max(1, w - left.length - right.length);
		return `${left}${" ".repeat(space)}${right}`;
	};

	const netKop = toKopecksBigInt(params.netRevenueKopecks, params.netRevenueRub);
	const cashKop = toKopecksBigInt(params.cashInDrawerKopecks, params.cashInDrawerRub);
	const cardKop = toKopecksBigInt(params.cardSumKopecks, params.cardSumRub);
	const sbpKop = toKopecksBigInt(params.sbpSumKopecks, params.sbpSumRub);
	const advanceKop = toKopecksBigInt(params.advanceOffsetKopecks, params.advanceOffsetRub);
	const effectiveKkt = params.kktRegNumber?.trim() || KKT_UNCONFIGURED_LABEL;
	const effectiveOfd = params.ofdName?.trim() || OFD_UNCONFIGURED_LABEL;

	const tapeLines: string[] = [
		div,
		`        ${params.clinicLegalName?.trim() || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}`,
		"        КАССОВЫЙ ЧЕК / СМЕННЫЙ ОТЧЕТ",
		div,
		pad("ККТ Рег. №:", effectiveKkt),
		pad("ОФД:", effectiveOfd),
		pad("Смена №:", String(params.shiftNumber)),
		pad("Кассир:", params.cashierFullName),
		line,
		pad("НАЛИЧНЫЕ:", formatKopecksToRub(cashKop)),
		pad("БЕЗНАЛ / КАРТЫ:", formatKopecksToRub(cardKop)),
		pad("СБП QR:", formatKopecksToRub(sbpKop)),
		pad("ЗАЧЕТ АВАНСА:", formatKopecksToRub(advanceKop)),
		line,
		pad("ИТОГО ВЫРУЧКА:", formatKopecksToRub(netKop)),
	];

	if (params.operations && params.operations.length > 0) {
		tapeLines.push(line);
		tapeLines.push("ПОСЛЕДНИЕ ОПЕРАЦИИ (БД):");
		for (const op of params.operations.slice(0, 5)) {
			const timeStr = op.createdAt
				? new Date(op.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
				: "";
			const typeLabel = op.operationType === "income" ? "ПРИХОД" : "РАСХОД";
			const opKop = toKopecksBigInt(op.amountKopecks, op.amountRub);
			tapeLines.push(pad(`${timeStr} ${typeLabel}:`, formatKopecksToRub(opKop)));
			if (op.reasonText) {
				tapeLines.push(`  ${op.reasonText.slice(0, w - 4)}`);
			}
		}
	} else {
		tapeLines.push(pad("ЖУРНАЛ ОПЕРАЦИЙ:", "0 проводок"));
	}

	tapeLines.push(line);
	tapeLines.push(pad("РЕЖИМ ККТ:", effectiveOfd === OFD_UNCONFIGURED_LABEL ? "Автономный" : "Касса онлайн"));
	tapeLines.push(div);
	tapeLines.push("       СПАСИБО ЗА ДОВЕРИЕ КЛИНИКЕ!");
	tapeLines.push(div);

	return tapeLines.join("\n");
}

export * from "./cashRegisterSplitsData.js";
