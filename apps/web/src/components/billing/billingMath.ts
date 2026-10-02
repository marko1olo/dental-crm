/**
 * billingMath.ts — Exact Integer Kopeck Arithmetic & Multi-Tender Split Billing Engine.
 * 
 * Compliance:
 * - Mandate 8b: Integer kopecks arithmetic without IEEE-754 float drift.
 * - Mandate 8e: Doctor autonomy, free discounts, zero-kopeck loss.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 * - 54-FZ (FFD 1.2): Multi-tender balancing (Cash, Card, SBP, Certificate, Deposit, Family).
 */

import {
	type Kopecks,
	parseKopecks,
	rublesToKopecks as sharedRublesToKopecks,
	kopecksToRubles as sharedKopecksToRubles,
	formatKopecksRu as sharedFormatKopecksRu,
} from "@dental/shared";

export interface LineItemForCalculation {
	readonly id?: string | undefined;
	readonly name?: string | undefined;
	readonly priceRub: number;
	readonly quantity: number;
	readonly discountRub?: number | undefined;
}

export interface InvoiceTotalsCalculationResult {
	readonly totalGrossKopecks: Kopecks;
	readonly totalGrossRub: number;
	readonly totalDiscountKopecks: Kopecks;
	readonly totalDiscountRub: number;
	readonly totalNetKopecks: Kopecks;
	readonly totalNetRub: number;
}

export interface SplitTenderInput {
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
}

export interface SplitTenderResult {
	readonly cashKopecks: Kopecks;
	readonly cashRub: number;
	readonly cardKopecks: Kopecks;
	readonly cardRub: number;
	readonly sbpKopecks: Kopecks;
	readonly sbpRub: number;
	readonly depositKopecks: Kopecks;
	readonly depositRub: number;
	readonly certificateKopecks: Kopecks;
	readonly certificateRub: number;
	readonly familyWalletKopecks: Kopecks;
	readonly familyWalletRub: number;
	readonly insuranceKopecks: Kopecks;
	readonly insuranceRub: number;
	readonly advanceOffsetKopecks: Kopecks; // 54-FZ Tag 1215 (Deposit + Certificate + Family)
	readonly advanceOffsetRub: number;
	readonly allocatedKopecks: Kopecks;
	readonly allocatedRub: number;
	readonly targetKopecks: Kopecks;
	readonly targetRub: number;
	readonly remainingKopecks: Kopecks;
	readonly remainingRub: number;
	readonly isBalanced: boolean;
	readonly isOverpaid: boolean;
	readonly isUnderpaid: boolean;
}

export interface CashChangeResult {
	readonly tenderedKopecks: Kopecks;
	readonly tenderedRub: number;
	readonly dueKopecks: Kopecks;
	readonly dueRub: number;
	readonly changeKopecks: Kopecks;
	readonly changeRub: number;
	readonly missingKopecks: Kopecks;
	readonly missingRub: number;
	readonly isUnderpaid: boolean;
	readonly isExact: boolean;
}

/**
 * Преобразует рубли в целочисленные копейки с защитой от ошибок IEEE-754.
 */
export function rublesToKopecks(rubles: number): Kopecks {
	if (!Number.isFinite(rubles) || rubles <= 0) return 0 as Kopecks;
	return Math.round(rubles * 100) as Kopecks;
}

/**
 * Преобразует копейки в рубли с фиксацией 2 знаков после запятой.
 */
export function kopecksToRubles(kopecks: Kopecks | number): number {
	if (!Number.isFinite(kopecks) || kopecks <= 0) return 0;
	return +(kopecks / 100).toFixed(2);
}

/**
 * Форматирует копейки в человекочитаемую строку на русском языке (например: "1 250,50 ₽").
 */
export function formatKopecksRu(kopecks: Kopecks | number): string {
	const rub = kopecksToRubles(kopecks);
	return (
		rub.toLocaleString("ru-RU", {
			minimumFractionDigits: rub % 1 !== 0 ? 2 : 0,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

/**
 * Честный расчет итогов счета по позициям номенклатуры с учетом скидок до последней копейки.
 */
export function calculateInvoiceTotals(items: readonly LineItemForCalculation[]): InvoiceTotalsCalculationResult {
	let totalGrossKop = 0 as Kopecks;
	let totalDiscountKop = 0 as Kopecks;

	for (const item of items) {
		const qty = Math.max(1, Number(item.quantity) || 1);
		const unitPriceKop = rublesToKopecks(item.priceRub);
		const lineGrossKop = (unitPriceKop * qty) as Kopecks;
		const discountRub = Math.max(0, Number(item.discountRub) || 0);
		const lineDiscountKop = Math.min(lineGrossKop, rublesToKopecks(discountRub));

		totalGrossKop = (totalGrossKop + lineGrossKop) as Kopecks;
		totalDiscountKop = (totalDiscountKop + lineDiscountKop) as Kopecks;
	}

	const totalNetKop = Math.max(0, totalGrossKop - totalDiscountKop) as Kopecks;

	return {
		totalGrossKopecks: totalGrossKop,
		totalGrossRub: kopecksToRubles(totalGrossKop),
		totalDiscountKopecks: totalDiscountKop,
		totalDiscountRub: kopecksToRubles(totalDiscountKop),
		totalNetKopecks: totalNetKop,
		totalNetRub: kopecksToRubles(totalNetKop),
	};
}

/**
 * Расчет смешанной оплаты по 54-ФЗ (Наличные, Карта, СБП, Депозит, Сертификат, Семья, ДМС).
 * Гарантирует строгое копеечное равенство суммы частей сумме счета.
 */
export function calculateSplitTenders(
	targetAmountKopecks: Kopecks | number,
	input: SplitTenderInput,
): SplitTenderResult {
	const targetKopecks = Math.max(0, Math.round(targetAmountKopecks)) as Kopecks;

	const cashKop = rublesToKopecks(Math.max(0, input.cashRub || 0));
	const cardKop = rublesToKopecks(Math.max(0, input.cardRub || 0));
	const sbpKop = rublesToKopecks(Math.max(0, input.sbpRub || 0));
	const depositKop = rublesToKopecks(Math.max(0, input.depositRub || 0));
	const certKop = rublesToKopecks(Math.max(0, input.certificateRub || 0));
	const familyKop = rublesToKopecks(Math.max(0, input.familyWalletRub || 0));
	const insuranceKop = rublesToKopecks(Math.max(0, input.insuranceRub || 0));

	const advanceOffsetKop = (depositKop + certKop + familyKop) as Kopecks;
	const allocatedKop = (cashKop + cardKop + sbpKop + advanceOffsetKop + insuranceKop) as Kopecks;
	const remainingKop = (targetKopecks - allocatedKop) as Kopecks;

	return {
		cashKopecks: cashKop,
		cashRub: kopecksToRubles(cashKop),
		cardKopecks: cardKop,
		cardRub: kopecksToRubles(cardKop),
		sbpKopecks: sbpKop,
		sbpRub: kopecksToRubles(sbpKop),
		depositKopecks: depositKop,
		depositRub: kopecksToRubles(depositKop),
		certificateKopecks: certKop,
		certificateRub: kopecksToRubles(certKop),
		familyWalletKopecks: familyKop,
		familyWalletRub: kopecksToRubles(familyKop),
		insuranceKopecks: insuranceKop,
		insuranceRub: kopecksToRubles(insuranceKop),
		advanceOffsetKopecks: advanceOffsetKop,
		advanceOffsetRub: kopecksToRubles(advanceOffsetKop),
		allocatedKopecks: allocatedKop,
		allocatedRub: kopecksToRubles(allocatedKop),
		targetKopecks,
		targetRub: kopecksToRubles(targetKopecks),
		remainingKopecks: remainingKop,
		remainingRub: +(remainingKop / 100).toFixed(2),
		isBalanced: allocatedKop === targetKopecks,
		isOverpaid: allocatedKop > targetKopecks,
		isUnderpaid: allocatedKop < targetKopecks,
	};
}

/**
 * Точный мгновенный расчет сдачи с наличных (без float-артефактов).
 */
export function calculateCashChange(
	tenderedRub: number,
	dueRub: number,
): CashChangeResult {
	const tenderedKop = rublesToKopecks(tenderedRub);
	const dueKop = rublesToKopecks(dueRub);

	if (tenderedKop >= dueKop) {
		const changeKop = (tenderedKop - dueKop) as Kopecks;
		return {
			tenderedKopecks: tenderedKop,
			tenderedRub: kopecksToRubles(tenderedKop),
			dueKopecks: dueKop,
			dueRub: kopecksToRubles(dueKop),
			changeKopecks: changeKop,
			changeRub: kopecksToRubles(changeKop),
			missingKopecks: 0 as Kopecks,
			missingRub: 0,
			isUnderpaid: false,
			isExact: changeKop === 0,
		};
	}

	const missingKop = (dueKop - tenderedKop) as Kopecks;
	return {
		tenderedKopecks: tenderedKop,
		tenderedRub: kopecksToRubles(tenderedKop),
		dueKopecks: dueKop,
		dueRub: kopecksToRubles(dueKop),
		changeKopecks: 0 as Kopecks,
		changeRub: 0,
		missingKopecks: missingKop,
		missingRub: kopecksToRubles(missingKop),
		isUnderpaid: true,
		isExact: false,
	};
}

/**
 * Равномерное детерминированное распределение суммы рассрочки по месяцам с защитой от потери копеек.
 * Неделимый копеечный остаток относится на первый регулярный платеж.
 */
export function calculateInstallmentScheduleKopecks(
	totalKopecks: Kopecks | number,
	downPaymentKopecks: Kopecks | number,
	monthsCount: number,
): {
	downPaymentKopecks: Kopecks;
	monthlyPayments: readonly Kopecks[];
	totalScheduledKopecks: Kopecks;
} {
	const totalKop = Math.max(0, Math.round(totalKopecks)) as Kopecks;
	const downPaymentKop = Math.min(totalKop, Math.max(0, Math.round(downPaymentKopecks))) as Kopecks;
	const months = Math.max(1, Math.round(monthsCount));

	const remainingToPay = (totalKop - downPaymentKop) as Kopecks;
	if (remainingToPay <= 0) {
		return {
			downPaymentKopecks: totalKop,
			monthlyPayments: [],
			totalScheduledKopecks: totalKop,
		};
	}

	const baseMonthlyKop = Math.floor(remainingToPay / months) as Kopecks;
	const remainderKop = (remainingToPay - baseMonthlyKop * months) as Kopecks;

	const payments: Kopecks[] = [];
	for (let i = 0; i < months; i++) {
		// Добавляем неделимый остаток к первому платежу
		const monthlyAmt = (i === 0 ? baseMonthlyKop + remainderKop : baseMonthlyKop) as Kopecks;
		payments.push(monthlyAmt);
	}

	const totalScheduled = (downPaymentKop + payments.reduce((acc, p) => acc + p, 0)) as Kopecks;

	return {
		downPaymentKopecks: downPaymentKop,
		monthlyPayments: payments,
		totalScheduledKopecks: totalScheduled,
	};
}
