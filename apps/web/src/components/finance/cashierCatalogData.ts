/**
 * apps/web/src/components/finance/cashierCatalogData.ts
 * Канонический SSOT Студии кассы, фискализации и чеков DENTE CRM.
 * Мандаты 8e (Автономия врача/кассира), 8n (соло-практика), 8b (Sweet Spot 300-350 строк), 8wy (amountKopecks).
 */

export type PaymentMethodId = "cash" | "card" | "sbp" | "deposit" | "b2b" | "split" | "warranty";

export interface PaymentMethodOption {
	readonly id: PaymentMethodId;
	readonly label: string;
	readonly shortLabel: string;
	readonly icon: string;
	readonly description: string;
	readonly badge?: string;
}

export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
	{ id: "card", label: "Банковская карта (POS)", shortLabel: "Карта", icon: "CreditCard", description: "Терминал эквайринга", badge: "Основной" },
	{ id: "cash", label: "Наличные средства", shortLabel: "Наличные", icon: "Banknote", description: "В денежный ящик" },
	{ id: "sbp", label: "СБП QR (Система быстрых платежей)", shortLabel: "СБП QR", icon: "QrCode", description: "Мгновенный перевод", badge: "0.4%" },
	{ id: "deposit", label: "Семейный депозит / Аванс", shortLabel: "Депозит", icon: "Wallet", description: "Списание аванса" },
	{ id: "split", label: "Комбинированная оплата (Сплит)", shortLabel: "Сплит", icon: "Layers", description: "Нал + карта + аванс" },
	{ id: "b2b", label: "Безналичный расчёт (Юрлица)", shortLabel: "Юрлицо", icon: "Building2", description: "По счёту организации" },
	{ id: "warranty", label: "Гарантийный случай (0 ₽)", shortLabel: "Гарантия", icon: "ShieldCheck", description: "Гарантия клиники" },
] as const;

export interface SplitTenders {
	cashKopecks: number;
	cardKopecks: number;
	sbpKopecks: number;
	depositKopecks: number;
	b2bKopecks: number;
}

export function createEmptySplitTenders(): SplitTenders {
	return { cashKopecks: 0, cardKopecks: 0, sbpKopecks: 0, depositKopecks: 0, b2bKopecks: 0 };
}

export function rubToKopecks(rub: number): number {
	return Number.isFinite(rub) ? Math.round(rub * 100) : 0;
}

export function kopecksToRub(kopecks: number | bigint): number {
	const n = typeof kopecks === "bigint" ? Number(kopecks) : kopecks;
	return Number.isFinite(n) ? Math.round(n) / 100 : 0;
}

export function formatKopecks(kopecks: number | bigint, options?: { showZeroKopecks?: boolean }): string {
	const rub = kopecksToRub(kopecks);
	const hasCents = Math.abs(rub % 1) > 0.0001;
	if (!hasCents && !options?.showZeroKopecks) return `${Math.round(rub).toLocaleString("ru-RU")} ₽`;
	return `${rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function formatRub(rub: number): string {
	return formatKopecks(rubToKopecks(rub));
}

export function calculateAllocatedKopecks(tenders: Partial<SplitTenders>): number {
	return (tenders.cashKopecks || 0) + (tenders.cardKopecks || 0) + (tenders.sbpKopecks || 0) + (tenders.depositKopecks || 0) + (tenders.b2bKopecks || 0);
}

export interface SplitValidationResult {
	readonly isValid: boolean;
	readonly allocatedKopecks: number;
	readonly diffKopecks: number;
	readonly messageRu?: string;
}

export function validateSplitTenders(totalDueKopecks: number, tenders: Partial<SplitTenders>): SplitValidationResult {
	const safeTotal = Math.max(0, Math.round(totalDueKopecks));
	const allocated = calculateAllocatedKopecks(tenders);
	const diff = allocated - safeTotal;
	if (diff === 0) return { isValid: true, allocatedKopecks: allocated, diffKopecks: 0 };
	if (diff > 0) return { isValid: false, allocatedKopecks: allocated, diffKopecks: diff, messageRu: `Превышение суммы счета на ${formatKopecks(diff)}` };
	return { isValid: false, allocatedKopecks: allocated, diffKopecks: diff, messageRu: `Не распределено ${formatKopecks(Math.abs(diff))}` };
}

export function autoBalanceSplitTender(
	totalDueKopecks: number,
	currentTenders: Partial<SplitTenders>,
	targetKey: keyof SplitTenders = "cardKopecks",
): SplitTenders {
	const safeTotal = Math.max(0, Math.round(totalDueKopecks));
	const result = { ...createEmptySplitTenders(), ...currentTenders };
	result[targetKey] = 0;
	result[targetKey] = Math.max(0, safeTotal - calculateAllocatedKopecks(result));
	return result;
}

export interface FastTenderPreset {
	readonly id: string;
	readonly label: string;
	readonly description: string;
	readonly tenders: SplitTenders;
}

export function getFastPresetTenders(totalDueKopecks: number, availableDepositKopecks = 0): readonly FastTenderPreset[] {
	const safeTotal = Math.max(0, Math.round(totalDueKopecks));
	const safeDeposit = Math.max(0, Math.round(availableDepositKopecks));
	const presets: FastTenderPreset[] = [
		{ id: "all_card", label: "100% Картой", description: "Терминал эквайринга", tenders: { ...createEmptySplitTenders(), cardKopecks: safeTotal } },
		{ id: "all_cash", label: "100% Наличными", description: "Без сдачи", tenders: { ...createEmptySplitTenders(), cashKopecks: safeTotal } },
		{ id: "all_sbp", label: "100% СБП QR", description: "Оплата смартфоном", tenders: { ...createEmptySplitTenders(), sbpKopecks: safeTotal } },
	];
	if (safeDeposit > 0) {
		if (safeDeposit >= safeTotal) {
			presets.unshift({
				id: "all_deposit",
				label: "100% С депозита",
				description: `Списание ${formatKopecks(safeTotal)}`,
				tenders: { ...createEmptySplitTenders(), depositKopecks: safeTotal },
			});
		} else {
			presets.push({
				id: "deposit_plus_card",
				label: "Весь аванс + Карта",
				description: `${formatKopecks(safeDeposit)} + ${formatKopecks(safeTotal - safeDeposit)}`,
				tenders: { ...createEmptySplitTenders(), depositKopecks: safeDeposit, cardKopecks: safeTotal - safeDeposit },
			});
		}
	}
	return presets;
}

export interface CashierReceiptItem {
	name: string;
	quantity: number;
	priceKopecks: number;
	totalKopecks: number;
	vatRate?: string;
}

export interface CashierReceiptRecord {
	id: string;
	receiptNumber: string;
	shiftNumber: number;
	createdAt: string;
	cashierFullName: string;
	clinicName: string;
	clinicInn: string;
	clinicAddress: string;
	patientName: string;
	items: CashierReceiptItem[];
	totalDueKopecks: number;
	paymentMethod: PaymentMethodId;
	splitTenders?: Partial<SplitTenders>;
	fiscalSign?: string;
	fnsUrl?: string;
	widthMm?: 58 | 80;
}

export interface CashierShiftSummary {
	shiftNumber: number;
	openedAt: string;
	closedAt?: string;
	cashierFullName: string;
	cashBoxName: string;
	startingCashKopecks: number;
	incomeCashKopecks: number;
	incomeElectronicKopecks: number;
	incomeSbpKopecks: number;
	incomeDepositOffsetKopecks: number;
	refundTotalKopecks: number;
	netRevenueKopecks: number;
	expectedCashInDrawerKopecks: number;
	actualCashInDrawerKopecks?: number;
	differenceKopecks?: number;
	totalReceiptsCount: number;
	isClosed: boolean;
}

export function calculateShiftTotals(
	receipts: readonly CashierReceiptRecord[],
	startingCashKopecks = 500000,
	actualCashKopecks?: number,
): CashierShiftSummary {
	let incomeCash = 0;
	let incomeElectronic = 0;
	let incomeSbp = 0;
	let incomeDeposit = 0;

	for (const r of receipts) {
		if (r.paymentMethod === "cash") incomeCash += r.totalDueKopecks;
		else if (r.paymentMethod === "card") incomeElectronic += r.totalDueKopecks;
		else if (r.paymentMethod === "sbp") incomeSbp += r.totalDueKopecks;
		else if (r.paymentMethod === "deposit") incomeDeposit += r.totalDueKopecks;
		else if (r.paymentMethod === "split" && r.splitTenders) {
			incomeCash += r.splitTenders.cashKopecks || 0;
			incomeElectronic += (r.splitTenders.cardKopecks || 0) + (r.splitTenders.b2bKopecks || 0);
			incomeSbp += r.splitTenders.sbpKopecks || 0;
			incomeDeposit += r.splitTenders.depositKopecks || 0;
		}
	}

	const expectedCash = startingCashKopecks + incomeCash;
	const netRevenue = incomeCash + incomeElectronic + incomeSbp + incomeDeposit;
	const diff = actualCashKopecks !== undefined ? actualCashKopecks - expectedCash : 0;

	return {
		shiftNumber: receipts[0]?.shiftNumber || 42,
		openedAt: receipts[0]?.createdAt || new Date().toISOString(),
		cashierFullName: receipts[0]?.cashierFullName || "Администратор клиники",
		cashBoxName: "Основная касса ресепшн (ККТ №1)",
		startingCashKopecks,
		incomeCashKopecks: incomeCash,
		incomeElectronicKopecks: incomeElectronic,
		incomeSbpKopecks: incomeSbp,
		incomeDepositOffsetKopecks: incomeDeposit,
		refundTotalKopecks: 0,
		netRevenueKopecks: netRevenue,
		expectedCashInDrawerKopecks: expectedCash,
		actualCashInDrawerKopecks: actualCashKopecks ?? expectedCash,
		differenceKopecks: diff,
		totalReceiptsCount: receipts.length,
		isClosed: false,
	};
}

export function generateThermalReceiptText(receipt: CashierReceiptRecord, widthMm: 58 | 80 = 80): string {
	const cols = widthMm === 58 ? 32 : 44;
	const hr = "-".repeat(cols);
	const dhr = "=".repeat(cols);
	const padCenter = (s: string) => " ".repeat(Math.max(0, Math.floor((cols - s.length) / 2))) + s;
	const padBetween = (l: string, r: string) => l + " ".repeat(Math.max(1, cols - l.length - r.length)) + r;

	const lines: string[] = [
		dhr,
		padCenter(receipt.clinicName),
		padCenter(`ИНН: ${receipt.clinicInn}`),
		padCenter(receipt.clinicAddress),
		hr,
		padCenter("КАССОВЫЙ ЧЕК / ПРИХОД"),
		padBetween(`Смена №${receipt.shiftNumber}`, `Чек №${receipt.receiptNumber}`),
		padBetween("Дата/время:", new Date(receipt.createdAt).toLocaleString("ru-RU")),
		padBetween("Кассир:", receipt.cashierFullName),
		padBetween("Пациент:", receipt.patientName),
		hr,
	];

	for (let i = 0; i < receipt.items.length; i++) {
		const item = receipt.items[i];
		lines.push(`${i + 1}. ${item.name}`);
		const qtyPrice = `${item.quantity} x ${formatKopecks(item.priceKopecks)}`;
		lines.push(padBetween(`   ${qtyPrice}`, formatKopecks(item.totalKopecks)));
	}

	lines.push(hr);
	lines.push(padBetween("ИТОГО К ОПЛАТЕ:", formatKopecks(receipt.totalDueKopecks)));
	lines.push(hr);

	const methodLabels: Record<PaymentMethodId, string> = {
		cash: "Наличными",
		card: "Банковской картой",
		sbp: "СБП QR",
		deposit: "Аванс / Депозит",
		split: "Комбинированная (Сплит)",
		b2b: "Безналичный расчёт",
		warranty: "Гарантия клиники",
	};
	lines.push(padBetween("Способ оплаты:", methodLabels[receipt.paymentMethod] || "Оплата"));

	if (receipt.splitTenders && receipt.paymentMethod === "split") {
		if (receipt.splitTenders.cashKopecks) lines.push(padBetween("  - Наличными:", formatKopecks(receipt.splitTenders.cashKopecks)));
		if (receipt.splitTenders.cardKopecks) lines.push(padBetween("  - Картой:", formatKopecks(receipt.splitTenders.cardKopecks)));
		if (receipt.splitTenders.sbpKopecks) lines.push(padBetween("  - СБП QR:", formatKopecks(receipt.splitTenders.sbpKopecks)));
		if (receipt.splitTenders.depositKopecks) lines.push(padBetween("  - Депозит:", formatKopecks(receipt.splitTenders.depositKopecks)));
	}

	lines.push(padBetween("СНО:", "УСН Доходы"));
	lines.push(padBetween("НДС:", "Без НДС (ст. 149 НК РФ)"));
	lines.push(hr);
	lines.push(padBetween("ФПД (фискальный признак):", receipt.fiscalSign || "9823471029"));
	lines.push(padCenter("Сайт проверки чеков: kkt-online.nalog.ru"));
	lines.push(padCenter("Спасибо за визит в нашу клинику!"));
	lines.push(dhr);

	return lines.join("\n");
}

export function isDemoShowcaseMode(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search.toLowerCase();
	const h = window.location.hash.toLowerCase();
	return s.includes("demo=true") || s.includes("demo=1") || h.includes("demo") || localStorage.getItem("dente_demo_mode") === "true";
}

export const DEMO_CASHIER_RECEIPTS: readonly CashierReceiptRecord[] = [
	{
		id: "rec-demo-01",
		receiptNumber: "00142",
		shiftNumber: 42,
		createdAt: "2026-10-31T11:15:00.000Z",
		cashierFullName: "Смирнова Елена (Старший администратор)",
		clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn: "7701234567",
		clinicAddress: "г. Москва, ул. Стоматологов, д. 12",
		patientName: "Алексеев Михаил Сергеевич",
		items: [
			{ name: "Комплексная гигиена полости рта Air-Flow", quantity: 1, priceKopecks: 650000, totalKopecks: 650000 },
			{ name: "Анестезия инфильтрационная Ультракаин DS", quantity: 1, priceKopecks: 120000, totalKopecks: 120000 },
		],
		totalDueKopecks: 770000,
		paymentMethod: "card",
		fiscalSign: "4198237190",
	},
	{
		id: "rec-demo-02",
		receiptNumber: "00143",
		shiftNumber: 42,
		createdAt: "2026-10-31T12:40:00.000Z",
		cashierFullName: "Смирнова Елена (Старший администратор)",
		clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn: "7701234567",
		clinicAddress: "г. Москва, ул. Стоматологов, д. 12",
		patientName: "Воронова Анна Павловна",
		items: [
			{ name: "Лечение кариеса 4.6 светоотверждаемым композитом", quantity: 1, priceKopecks: 950000, totalKopecks: 950000 },
		],
		totalDueKopecks: 950000,
		paymentMethod: "sbp",
		fiscalSign: "5281903481",
	},
	{
		id: "rec-demo-03",
		receiptNumber: "00144",
		shiftNumber: 42,
		createdAt: "2026-10-31T14:10:00.000Z",
		cashierFullName: "Смирнова Елена (Старший администратор)",
		clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn: "7701234567",
		clinicAddress: "г. Москва, ул. Стоматологов, д. 12",
		patientName: "Кузнецов Дмитрий Игоревич",
		items: [
			{ name: "Прицельный снимок зуба на визиографе (RVG)", quantity: 2, priceKopecks: 60000, totalKopecks: 120000 },
			{ name: "Консультация стоматолога-ортопеда", quantity: 1, priceKopecks: 180000, totalKopecks: 180000 },
		],
		totalDueKopecks: 300000,
		paymentMethod: "cash",
		fiscalSign: "6392014592",
	},
];
