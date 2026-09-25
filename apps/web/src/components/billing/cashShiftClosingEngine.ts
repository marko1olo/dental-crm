/**
 * cashShiftClosingEngine.ts — Statutory 54-FZ (FFD 1.2) Cash Shift Closing, Reconciliation & Encashment Engine.
 *
 * Compliant with:
 * - Federal Law No. 54-FZ & Order of FTS of Russia No. ED-7-20/662@ (FFD 1.2 / ФФД 1.2)
 * - Bank of Russia Directive No. 3210-U (Cash Operations & Documents KO-1, KO-2)
 * - Federal Law No. 402-FZ "On Accounting"
 * - Integer Kopeck Arithmetic (Zero Floating Point Loss)
 */

import {
	type Ffd12OperationType,
	type Kopecks,
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	rubToKopecks,
	sumKopecks,
} from "@dental/shared";

export type CashShiftStatus = "not_opened" | "open" | "closed" | "expired_24h";

export type CashShiftOperationType =
	| "open_shift"
	| "cash_in"
	| "cash_out"
	| "encashment"
	| "patient_payment"
	| "patient_refund"
	| "close_shift";

export type CashDiscrepancyReason =
	| "exact_match"
	| "cashier_change_error"
	| "unrecorded_cash_operation"
	| "pos_terminal_desync"
	| "bank_holding_delay"
	| "technical_kkt_malfunction"
	| "rounding_difference"
	| "other";

export const CASH_DISCREPANCY_REASON_LABELS: Record<CashDiscrepancyReason, string> = {
	exact_match: "Расхождений нет (100% совпадение)",
	cashier_change_error: "Ошибка кассира при выдаче сдачи",
	unrecorded_cash_operation: "Неучтенная наличная операция (без пробития чека)",
	pos_terminal_desync: "Рассинхронизация с банковским POS-терминалом",
	bank_holding_delay: "Задержка клиринга СБП / межбанковский холдинг",
	technical_kkt_malfunction: "Технический сбой ККТ / фискального накопителя",
	rounding_difference: "Суммарная погрешность округления",
	other: "Иная причина (см. объяснительную записку)",
};

export interface CashDenominations {
	readonly b5000: number;
	readonly b2000: number;
	readonly b1000: number;
	readonly b500: number;
	readonly b200: number;
	readonly b100: number;
	readonly b50: number;
	readonly c10: number;
	readonly c5: number;
	readonly c2: number;
	readonly c1: number;
	readonly coinsFractionalRub: number;
}

export const EMPTY_CASH_DENOMINATIONS: CashDenominations = {
	b5000: 0,
	b2000: 0,
	b1000: 0,
	b500: 0,
	b200: 0,
	b100: 0,
	b50: 0,
	c10: 0,
	c5: 0,
	c2: 0,
	c1: 0,
	coinsFractionalRub: 0,
};

export interface CashShiftOperationRecord {
	readonly id: string;
	readonly timestampIso: string;
	readonly type: CashShiftOperationType;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly tenderType?: "cash" | "card" | "sbp" | "advance_offset" | "mixed" | undefined;
	readonly description: string;
	readonly docNumber?: string | undefined;
	readonly patientName?: string | undefined;
	readonly cashierFullName: string;
}

export interface ClinicFiscalDetails {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly address: string;
	readonly kktRegNumber: string;
	readonly kktSerialNumber: string;
	readonly kktModelName?: string | undefined;
	readonly fnSerialNumber: string;
	readonly ofdName: string;
	readonly chiefExecutiveFullName: string;
	readonly chiefAccountantFullName: string;
}

export const DEFAULT_CLINIC_FISCAL_DETAILS: ClinicFiscalDetails = {
	legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	inn: "",
	kpp: "",
	ogrn: "",
	address: "",
	kktRegNumber: "0004829104058291",
	kktSerialNumber: "019482019482",
	kktModelName: "АТОЛ 27Ф",
	fnSerialNumber: "9960440302145896",
	ofdName: "АО «ПЕРВЫЙ ОФД»",
	chiefExecutiveFullName: "",
	chiefAccountantFullName: "",
};

export interface CashShiftTendersBreakdown {
	readonly cashIncomeRub: number;
	readonly cashIncomeKopecks: Kopecks;
	readonly cardIncomeRub: number;
	readonly cardIncomeKopecks: Kopecks;
	readonly sbpIncomeRub: number;
	readonly sbpIncomeKopecks: Kopecks;
	readonly advanceOffsetIncomeRub: number;
	readonly advanceOffsetIncomeKopecks: Kopecks;
	readonly totalGrossIncomeRub: number;
	readonly totalGrossIncomeKopecks: Kopecks;

	// Returns (Tag 1054 = 2)
	readonly cashReturnRub: number;
	readonly cashReturnKopecks: Kopecks;
	readonly cardReturnRub: number;
	readonly cardReturnKopecks: Kopecks;
	readonly sbpReturnRub: number;
	readonly sbpReturnKopecks: Kopecks;
	readonly advanceOffsetReturnRub: number;
	readonly advanceOffsetReturnKopecks: Kopecks;
	readonly totalReturnsRub: number;
	readonly totalReturnsKopecks: Kopecks;

	// Net Revenue
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: Kopecks;
}

export interface CashShiftReconciliationResult {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly initialChangeFundRub: number;
	readonly initialChangeFundKopecks: Kopecks;

	// Drawer movement
	readonly totalCashInflowRub: number;
	readonly totalCashInflowKopecks: Kopecks;
	readonly totalCashOutflowRub: number;
	readonly totalCashOutflowKopecks: Kopecks;
	readonly calculatedCashInDrawerRub: number;
	readonly calculatedCashInDrawerKopecks: Kopecks;

	// Physical count
	readonly countedCashInDrawerRub: number;
	readonly countedCashInDrawerKopecks: Kopecks;
	readonly differenceRub: number;
	readonly differenceKopecks: Kopecks;
	readonly status: "balanced" | "surplus" | "shortage";
	readonly discrepancyReason: CashDiscrepancyReason;
	readonly discrepancyReasonLabel: string;
	readonly cashierExplanation?: string | undefined;
	readonly isExplanationRequired: boolean;

	// Encashment
	readonly retainedNextShiftChangeFundRub: number;
	readonly retainedNextShiftChangeFundKopecks: Kopecks;
	readonly encashmentAmountRub: number;
	readonly encashmentAmountKopecks: Kopecks;

	// 54-FZ Breakdown
	readonly tenders: CashShiftTendersBreakdown;
	readonly totalOperationsCount: number;
	readonly receiptsCount: number;
	readonly returnsCount: number;
	readonly isShiftDurationExceeded24h: boolean;
	readonly isShiftDurationWarning20h: boolean;
	readonly shiftDurationHours: number;
	readonly shiftDurationFormatted: string;
	readonly hoursRemainingUntil24h: number;
	readonly ftsWarningMessage?: string | undefined;
}

/**
 * Calculates total kopecks for denomination breakdown.
 */
export function calculateDenominationsTotalKopecks(d: CashDenominations): Kopecks {
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

	return (b5000 + b2000 + b1000 + b500 + b200 + b100 + b50 + c10 + c5 + c2 + c1 + coins) as Kopecks;
}

/**
 * Calculates total rubles for denomination breakdown.
 */
export function calculateDenominationsTotalRub(d: CashDenominations): number {
	return kopecksToRub(calculateDenominationsTotalKopecks(d));
}

/**
 * Compiles and validates full 54-FZ cash shift reconciliation.
 */
export function calculateCashShiftBalances(params: {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly operations: readonly CashShiftOperationRecord[];
	readonly countedCashRub?: number | undefined;
	readonly denominations?: CashDenominations | undefined;
	readonly retainedChangeFundRub?: number | undefined;
	readonly discrepancyReason?: CashDiscrepancyReason | undefined;
	readonly cashierExplanation?: string | undefined;
}): CashShiftReconciliationResult {
	const {
		shiftNumber,
		openedAtIso,
		closedAtIso = new Date().toISOString(),
		cashierFullName,
		cashierInn,
		initialChangeFundRub = 0,
		operations,
		countedCashRub,
		denominations,
		retainedChangeFundRub = 0,
		discrepancyReason = "exact_match",
		cashierExplanation,
	} = params;

	const initialChangeFundKopecks = Math.max(0, rubToKopecks(initialChangeFundRub)) as Kopecks;

	let cashIncomeKop = 0 as Kopecks;
	let cardIncomeKop = 0 as Kopecks;
	let sbpIncomeKop = 0 as Kopecks;
	let advanceOffsetIncomeKop = 0 as Kopecks;

	let cashReturnKop = 0 as Kopecks;
	let cardReturnKop = 0 as Kopecks;
	let sbpReturnKop = 0 as Kopecks;
	let advanceOffsetReturnKop = 0 as Kopecks;

	let manualCashInKop = 0 as Kopecks;
	let manualCashOutKop = 0 as Kopecks;

	let receiptsCount = 0;
	let returnsCount = 0;

	for (const op of operations) {
		const kop = op.amountKopecks !== undefined ? op.amountKopecks : (rubToKopecks(op.amountRub) as Kopecks);

		switch (op.type) {
			case "patient_payment":
				receiptsCount++;
				if (op.tenderType === "cash") cashIncomeKop = (cashIncomeKop + kop) as Kopecks;
				else if (op.tenderType === "card") cardIncomeKop = (cardIncomeKop + kop) as Kopecks;
				else if (op.tenderType === "sbp") sbpIncomeKop = (sbpIncomeKop + kop) as Kopecks;
				else if (op.tenderType === "advance_offset") advanceOffsetIncomeKop = (advanceOffsetIncomeKop + kop) as Kopecks;
				else cashIncomeKop = (cashIncomeKop + kop) as Kopecks;
				break;
			case "patient_refund":
				returnsCount++;
				if (op.tenderType === "cash") cashReturnKop = (cashReturnKop + kop) as Kopecks;
				else if (op.tenderType === "card") cardReturnKop = (cardReturnKop + kop) as Kopecks;
				else if (op.tenderType === "sbp") sbpReturnKop = (sbpReturnKop + kop) as Kopecks;
				else if (op.tenderType === "advance_offset") advanceOffsetReturnKop = (advanceOffsetReturnKop + kop) as Kopecks;
				else cashReturnKop = (cashReturnKop + kop) as Kopecks;
				break;
			case "cash_in":
				manualCashInKop = (manualCashInKop + kop) as Kopecks;
				break;
			case "cash_out":
			case "encashment":
				manualCashOutKop = (manualCashOutKop + kop) as Kopecks;
				break;
			case "open_shift":
			case "close_shift":
			default:
				break;
		}
	}

	const totalGrossIncomeKopecks = (cashIncomeKop + cardIncomeKop + sbpIncomeKop + advanceOffsetIncomeKop) as Kopecks;
	const totalReturnsKopecks = (cashReturnKop + cardReturnKop + sbpReturnKop + advanceOffsetReturnKop) as Kopecks;
	const netRevenueKopecks = Math.max(0, totalGrossIncomeKopecks - totalReturnsKopecks) as Kopecks;

	const totalCashInflowKopecks = (initialChangeFundKopecks + cashIncomeKop + manualCashInKop) as Kopecks;
	const totalCashOutflowKopecks = (cashReturnKop + manualCashOutKop) as Kopecks;
	const calculatedCashInDrawerKopecks = Math.max(0, totalCashInflowKopecks - totalCashOutflowKopecks) as Kopecks;

	let countedKopecks: Kopecks;
	if (denominations) {
		countedKopecks = calculateDenominationsTotalKopecks(denominations);
	} else if (countedCashRub !== undefined) {
		countedKopecks = Math.max(0, rubToKopecks(countedCashRub)) as Kopecks;
	} else {
		countedKopecks = calculatedCashInDrawerKopecks;
	}

	const differenceKopecks = (countedKopecks - calculatedCashInDrawerKopecks) as Kopecks;

	let status: "balanced" | "surplus" | "shortage" = "balanced";
	if (differenceKopecks > 0) status = "surplus";
	else if (differenceKopecks < 0) status = "shortage";

	const resolvedReason: CashDiscrepancyReason =
		status === "balanced" ? "exact_match" : discrepancyReason !== "exact_match" ? discrepancyReason : "other";

	const isExplanationRequired = status !== "balanced";

	const retainedKopecks = Math.min(
		countedKopecks,
		Math.max(0, rubToKopecks(retainedChangeFundRub)) as Kopecks,
	);
	const encashmentKopecks = Math.max(0, countedKopecks - retainedKopecks) as Kopecks;

	const openTime = new Date(openedAtIso).getTime();
	const closeTime = new Date(closedAtIso).getTime();
	const durationMs = Math.max(0, closeTime - openTime);
	const durationMinutes = Math.floor(durationMs / (1000 * 60));
	const durationHoursPart = Math.floor(durationMinutes / 60);
	const durationMinutesPart = durationMinutes % 60;
	const shiftDurationFormatted = `${durationHoursPart} ч ${String(durationMinutesPart).padStart(2, "0")} мин`;
	const shiftDurationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
	const isShiftDurationExceeded24h = durationMs > 24 * 60 * 60 * 1000;
	const isShiftDurationWarning20h = durationMs >= 20 * 60 * 60 * 1000 && !isShiftDurationExceeded24h;
	const remainingMs = Math.max(0, 24 * 60 * 60 * 1000 - durationMs);
	const hoursRemainingUntil24h = Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10;

	let ftsWarningMessage: string | undefined;
	if (isShiftDurationExceeded24h) {
		ftsWarningMessage = "Смена превысила 24 часа! В соответствии со ст. 4.3 54-ФЗ кассовые чеки заблокированы ККТ до снятия Z-отчета.";
	} else if (isShiftDurationWarning20h) {
		ftsWarningMessage = `Смена длится ${shiftDurationFormatted}. До блокировки ККТ по лимиту 24 ч осталось ${hoursRemainingUntil24h} ч.`;
	}

	const tenders: CashShiftTendersBreakdown = {
		cashIncomeRub: kopecksToRub(cashIncomeKop),
		cashIncomeKopecks: cashIncomeKop,
		cardIncomeRub: kopecksToRub(cardIncomeKop),
		cardIncomeKopecks: cardIncomeKop,
		sbpIncomeRub: kopecksToRub(sbpIncomeKop),
		sbpIncomeKopecks: sbpIncomeKop,
		advanceOffsetIncomeRub: kopecksToRub(advanceOffsetIncomeKop),
		advanceOffsetIncomeKopecks: advanceOffsetIncomeKop,
		totalGrossIncomeRub: kopecksToRub(totalGrossIncomeKopecks),
		totalGrossIncomeKopecks: totalGrossIncomeKopecks,

		cashReturnRub: kopecksToRub(cashReturnKop),
		cashReturnKopecks: cashReturnKop,
		cardReturnRub: kopecksToRub(cardReturnKop),
		cardReturnKopecks: cardReturnKop,
		sbpReturnRub: kopecksToRub(sbpReturnKop),
		sbpReturnKopecks: sbpReturnKop,
		advanceOffsetReturnRub: kopecksToRub(advanceOffsetReturnKop),
		advanceOffsetReturnKopecks: advanceOffsetReturnKop,
		totalReturnsRub: kopecksToRub(totalReturnsKopecks),
		totalReturnsKopecks: totalReturnsKopecks,

		netRevenueRub: kopecksToRub(netRevenueKopecks),
		netRevenueKopecks: netRevenueKopecks,
	};

	return {
		shiftNumber,
		openedAtIso,
		closedAtIso,
		cashierFullName,
		cashierInn,
		initialChangeFundRub: kopecksToRub(initialChangeFundKopecks),
		initialChangeFundKopecks,
		totalCashInflowRub: kopecksToRub(totalCashInflowKopecks),
		totalCashInflowKopecks,
		totalCashOutflowRub: kopecksToRub(totalCashOutflowKopecks),
		totalCashOutflowKopecks,
		calculatedCashInDrawerRub: kopecksToRub(calculatedCashInDrawerKopecks),
		calculatedCashInDrawerKopecks,
		countedCashInDrawerRub: kopecksToRub(countedKopecks),
		countedCashInDrawerKopecks: countedKopecks,
		differenceRub: kopecksToRub(differenceKopecks),
		differenceKopecks,
		status,
		discrepancyReason: resolvedReason,
		discrepancyReasonLabel: CASH_DISCREPANCY_REASON_LABELS[resolvedReason] || "Расхождение",
		cashierExplanation,
		isExplanationRequired,
		retainedNextShiftChangeFundRub: kopecksToRub(retainedKopecks),
		retainedNextShiftChangeFundKopecks: retainedKopecks,
		encashmentAmountRub: kopecksToRub(encashmentKopecks),
		encashmentAmountKopecks: encashmentKopecks,
		tenders,
		totalOperationsCount: operations.length,
		receiptsCount,
		returnsCount,
		isShiftDurationExceeded24h,
		isShiftDurationWarning20h,
		shiftDurationHours,
		shiftDurationFormatted,
		hoursRemainingUntil24h,
		ftsWarningMessage,
	};
}

/**
 * Converts integer rubles to Russian words according to Russian financial grammar.
 */
export function convertRubToWordsRu(amountRub: number): string {
	const kopecksTotal = Math.max(0, rubToKopecks(amountRub));
	const rubles = Math.floor(kopecksTotal / 100);
	const kopecks = kopecksTotal % 100;

	if (rubles === 0) {
		const kopStr = `${String(kopecks).padStart(2, "0")} ${declensionRu(kopecks, ["копейка", "копейки", "копеек"])}`;
		return `Ноль рублей ${kopStr}`;
	}

	const onesMasculine = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const onesFeminine = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = [
		"",
		"",
		"двадцать",
		"тридцать",
		"сорок",
		"пятьдесят",
		"шестьдесят",
		"семьдесят",
		"восемьдесят",
		"девяносто",
	];
	const hundreds = [
		"",
		"сто",
		"двести",
		"триста",
		"четыреста",
		"пятьсот",
		"шестьсот",
		"семьсот",
		"восемьсот",
		"девятьсот",
	];

	function triadToWords(n: number, isFeminine: boolean): string {
		const h = Math.floor(n / 100);
		const t = Math.floor((n % 100) / 10);
		const u = n % 10;
		const parts: string[] = [];

		if (h > 0) parts.push(hundreds[h]!);

		if (t === 1) {
			parts.push(teens[u]!);
		} else {
			if (t > 1) parts.push(tens[t]!);
			if (u > 0) {
				parts.push(isFeminine ? onesFeminine[u]! : onesMasculine[u]!);
			}
		}

		return parts.join(" ");
	}

	const billions = Math.floor(rubles / 1_000_000_000) % 1000;
	const millions = Math.floor(rubles / 1_000_000) % 1000;
	const thousands = Math.floor(rubles / 1000) % 1000;
	const units = rubles % 1000;

	const wordsParts: string[] = [];

	if (billions > 0) {
		wordsParts.push(triadToWords(billions, false));
		wordsParts.push(declensionRu(billions, ["миллиард", "миллиарда", "миллиардов"]));
	}
	if (millions > 0) {
		wordsParts.push(triadToWords(millions, false));
		wordsParts.push(declensionRu(millions, ["миллион", "миллиона", "миллионов"]));
	}
	if (thousands > 0) {
		wordsParts.push(triadToWords(thousands, true));
		wordsParts.push(declensionRu(thousands, ["тысяча", "тысячи", "тысяч"]));
	}
	if (units > 0 || wordsParts.length === 0) {
		wordsParts.push(triadToWords(units, false));
	}

	wordsParts.push(declensionRu(rubles, ["рубль", "рубля", "рублей"]));
	const kopecksStr = `${String(kopecks).padStart(2, "0")} ${declensionRu(kopecks, ["копейка", "копейки", "копеек"])}`;

	const result = `${wordsParts.filter(Boolean).join(" ").trim()} ${kopecksStr}`;
	return result.charAt(0).toUpperCase() + result.slice(1);
}

function declensionRu(count: number, forms: [string, string, string]): string {
	const n = Math.abs(count) % 100;
	const n1 = n % 10;
	if (n > 10 && n < 20) return forms[2];
	if (n1 > 1 && n1 < 5) return forms[1];
	if (n1 === 1) return forms[0];
	return forms[2];
}

export interface Ko1CashInflowVoucher {
	readonly docNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly receivedFrom: string;
	readonly basisRu: string;
	readonly amountRub: number;
	readonly amountWordsRu: string;
	readonly cashierFullName: string;
	readonly chiefAccountantFullName: string;
}

export interface Ko2CashOutflowVoucher {
	readonly docNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly issuedTo: string;
	readonly basisRu: string;
	readonly amountRub: number;
	readonly amountWordsRu: string;
	readonly recipientPassportRu?: string | undefined;
	readonly cashierFullName: string;
	readonly chiefAccountantFullName: string;
	readonly chiefExecutiveFullName: string;
}

export interface EncashmentStatementData {
	readonly statementNumber: string;
	readonly dateIso: string;
	readonly dateRu: string;
	readonly shiftNumber: number;
	readonly clinic: ClinicFiscalDetails;
	readonly cashierFullName: string;
	readonly encashmentAmountRub: number;
	readonly encashmentAmountWordsRu: string;
	readonly denominations: CashDenominations;
	readonly bagNumber?: string | undefined;
	readonly sealNumber?: string | undefined;
	readonly destination: "main_cash_desk" | "bank_collector" | "clinic_safe";
	readonly destinationLabel: string;
}

export interface ShiftClosingActData {
	readonly actNumber: string;
	readonly dateRu: string;
	readonly reconciliation: CashShiftReconciliationResult;
	readonly clinic: ClinicFiscalDetails;
}

/**
 * Generates official KO-1 Cash Inflow Voucher (ПКО) for initial change fund or manual deposit.
 */
export function generateKo1Voucher(params: {
	readonly docNumber: string;
	readonly amountRub: number;
	readonly receivedFrom: string;
	readonly basisRu: string;
	readonly cashierFullName: string;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
	readonly dateIso?: string | undefined;
}): Ko1CashInflowVoucher {
	const now = params.dateIso ? new Date(params.dateIso) : new Date();
	const clinic: ClinicFiscalDetails = {
		...DEFAULT_CLINIC_FISCAL_DETAILS,
		...(params.clinic || {}),
	};

	return {
		docNumber: params.docNumber,
		dateIso: now.toISOString(),
		dateRu: now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
		clinic,
		receivedFrom: params.receivedFrom,
		basisRu: params.basisRu,
		amountRub: params.amountRub,
		amountWordsRu: convertRubToWordsRu(params.amountRub),
		cashierFullName: params.cashierFullName,
		chiefAccountantFullName: clinic.chiefAccountantFullName,
	};
}

/**
 * Generates official KO-2 Cash Outflow Voucher (РКО) for encashment or safe transfer.
 */
export function generateKo2Voucher(params: {
	readonly docNumber: string;
	readonly amountRub: number;
	readonly issuedTo: string;
	readonly basisRu: string;
	readonly cashierFullName: string;
	readonly recipientPassportRu?: string | undefined;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
	readonly dateIso?: string | undefined;
}): Ko2CashOutflowVoucher {
	const now = params.dateIso ? new Date(params.dateIso) : new Date();
	const clinic: ClinicFiscalDetails = {
		...DEFAULT_CLINIC_FISCAL_DETAILS,
		...(params.clinic || {}),
	};

	return {
		docNumber: params.docNumber,
		dateIso: now.toISOString(),
		dateRu: now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
		clinic,
		issuedTo: params.issuedTo,
		basisRu: params.basisRu,
		amountRub: params.amountRub,
		amountWordsRu: convertRubToWordsRu(params.amountRub),
		recipientPassportRu: params.recipientPassportRu,
		cashierFullName: params.cashierFullName,
		chiefAccountantFullName: clinic.chiefAccountantFullName,
		chiefExecutiveFullName: clinic.chiefExecutiveFullName,
	};
}

/**
 * Generates statement of encashment.
 */
export function generateEncashmentStatement(params: {
	readonly shiftNumber: number;
	readonly statementNumber: string;
	readonly cashierFullName: string;
	readonly encashmentAmountRub: number;
	readonly denominations: CashDenominations;
	readonly destination?: "main_cash_desk" | "bank_collector" | "clinic_safe" | undefined;
	readonly bagNumber?: string | undefined;
	readonly sealNumber?: string | undefined;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
}): EncashmentStatementData {
	const now = new Date();
	const clinic: ClinicFiscalDetails = {
		...DEFAULT_CLINIC_FISCAL_DETAILS,
		...(params.clinic || {}),
	};

	const dest = params.destination || "clinic_safe";
	const destLabels = {
		main_cash_desk: "Главная касса организации",
		bank_collector: "Служба инкассации банка (ПАО Сбербанк)",
		clinic_safe: "Огнеупорный сейф клиники",
	};

	return {
		statementNumber: params.statementNumber,
		dateIso: now.toISOString(),
		dateRu: now.toLocaleDateString("ru-RU"),
		shiftNumber: params.shiftNumber,
		clinic,
		cashierFullName: params.cashierFullName,
		encashmentAmountRub: params.encashmentAmountRub,
		encashmentAmountWordsRu: convertRubToWordsRu(params.encashmentAmountRub),
		denominations: params.denominations,
		bagNumber: params.bagNumber || "—",
		sealNumber: params.sealNumber || "—",
		destination: dest,
		destinationLabel: destLabels[dest],
	};
}

/**
 * Generates Act of Cash Shift Closing.
 */
export function generateShiftClosingAct(params: {
	readonly reconciliation: CashShiftReconciliationResult;
	readonly actNumber?: string | undefined;
	readonly clinic?: Partial<ClinicFiscalDetails> | undefined;
}): ShiftClosingActData {
	const actNumber = params.actNumber || `АКТ-ЗКС-${params.reconciliation.shiftNumber}`;
	const clinic: ClinicFiscalDetails = {
		...DEFAULT_CLINIC_FISCAL_DETAILS,
		...(params.clinic || {}),
	};
	const dateRu = new Date(params.reconciliation.closedAtIso).toLocaleDateString("ru-RU");

	return {
		actNumber,
		dateRu,
		reconciliation: params.reconciliation,
		clinic,
	};
}

// Re-export print HTML templates and fiscal receipt tape formatting to keep module under 800 lines
export {
	generateKo1Html,
	generateKo2Html,
	generateShiftClosingActHtml,
	generateEncashmentStatementHtml,
	generateMonospacedTapeText,
} from "./cashShiftPrintTemplates.js";
