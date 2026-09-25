/**
 * cashboxOperations.ts
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: no disabled buttons, no obstacle INN for citizens, 1-click 100% warranty closing)
 * - 54-FZ & FFD 1.2 Tag 1228 (Buyer INN strictly optional for physical persons, required only for B2B legal entities/IP)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";

export * from "./cashboxInnValidation.js";

export interface ZeroDiscountCheckoutResult {
	readonly isZeroDue: boolean;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly totalNetKop: number;
	readonly status: "completed" | "ready_for_payment";
	readonly paymentStatus: "Оплачено (скидка 100%)" | "Ожидает оплаты";
	readonly statusBannerText: string;
	readonly bypassKktZeroReceipt: boolean;
	readonly fiscalSign: string;
	readonly receiptDocNumber: number;
}

export interface PaymentDiscountCalculation {
	readonly rawTotalDueRub: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly totalDueRub: number;
	readonly totalDueKopecks: number;
	readonly effectiveDiscountPercent: number;
	readonly discountPercent: number;
	readonly isWarranty100: boolean;
}

/**
 * Wave 66 (Feature 255): Doctor Autonomy & Multi-Tier Discounts calculation (Mandates 8b, 8e п. 7, 8k, 8n).
 * Guarantees penny-exact integer kopeck calculations without IEEE-754 float drift.
 */
export function calculatePaymentDiscount(
	rawTotalDueRub: number,
	options: {
		isWarranty100?: boolean;
		customDiscountRub?: number;
		discountPercent?: number;
	} = {},
): PaymentDiscountCalculation {
	const rawKop = rubToKopecks(rawTotalDueRub);
	if (options.isWarranty100) {
		return { rawTotalDueRub, discountRub: rawTotalDueRub, discountKopecks: rawKop, totalDueRub: 0, totalDueKopecks: 0, effectiveDiscountPercent: 100, discountPercent: 100, isWarranty100: true };
	}
	let cappedDiscountKop = 0;
	let effPercent = 0;
	if (options.customDiscountRub !== undefined && options.customDiscountRub > 0) {
		const customKop = rubToKopecks(options.customDiscountRub);
		cappedDiscountKop = Math.min(rawKop, customKop);
		effPercent = rawKop > 0 ? Number(((cappedDiscountKop / rawKop) * 100).toFixed(2)) : 0;
	} else if (options.discountPercent !== undefined && options.discountPercent > 0) {
		const discountKop = Math.round((rawKop * options.discountPercent) / 100);
		cappedDiscountKop = Math.min(rawKop, discountKop);
		effPercent = options.discountPercent;
	}
	const dueKop = Math.max(0, rawKop - cappedDiscountKop);
	return {
		rawTotalDueRub,
		discountRub: kopecksToRub(cappedDiscountKop),
		discountKopecks: cappedDiscountKop,
		totalDueRub: kopecksToRub(dueKop),
		totalDueKopecks: dueKop,
		effectiveDiscountPercent: effPercent,
		discountPercent: effPercent,
		isWarranty100: false,
	};
}

export type FastCheckoutDiscountPreset =
	| "none"
	| "round_hundreds"
	| "discount_3"
	| "discount_5"
	| "discount_10"
	| "warranty_100"
	| "colleague_100"
	| "manual_percent";

export interface FastCheckoutDiscountResult {
	readonly grossKop: number;
	readonly discountKop: number;
	readonly netKop: number;
	readonly discountRub: number;
	readonly netRub: number;
	readonly savingsText: string;
	readonly effectivePercent: number;
}

/**
 * Calculates doctor discounts and 100% warranty rework with exact integer kopecks (Mandate 8e: Doctor Autonomy).
 * Canonical SSOT for fast checkout, invoices, and payment modal discount calculations.
 * - round_hundreds: rounds bill down to hundreds of rubles in favor of the patient
 * - warranty_100: 100% warranty rework discount (due 0 ₽) without admin passwords
 * - colleague_100: 100% staff / doctor treatment (due 0 ₽)
 * - discount_3 / discount_5 / discount_10: 1-click doctor presets
 * - manual_percent: arbitrary percentage (0..100)
 */
export function calculateFastCheckoutDiscount(params: {
	readonly grossKop: number;
	readonly preset: FastCheckoutDiscountPreset;
	readonly customPercent?: number | undefined;
}): FastCheckoutDiscountResult {
	const gross = Math.max(0, Math.round(params.grossKop));
	if (gross === 0 || params.preset === "none") {
		return {
			grossKop: gross,
			discountKop: 0,
			netKop: gross,
			discountRub: 0,
			netRub: gross / 100,
			savingsText: "0.00 ₽",
			effectivePercent: 0,
		};
	}

	let discountKop = 0;
	if (params.preset === "round_hundreds") {
		if (gross >= 10000) {
			const roundedKop = Math.floor(gross / 10000) * 10000;
			discountKop = gross - roundedKop;
		} else {
			const roundedKop = Math.floor(gross / 100) * 100;
			discountKop = gross - roundedKop;
		}
	} else if (params.preset === "discount_3") {
		discountKop = Math.round((gross * 3) / 100);
	} else if (params.preset === "discount_5") {
		discountKop = Math.round((gross * 5) / 100);
	} else if (params.preset === "discount_10") {
		discountKop = Math.round((gross * 10) / 100);
	} else if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		discountKop = gross;
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		discountKop = Math.round((gross * pct) / 100);
	}

	discountKop = Math.max(0, Math.min(gross, discountKop));
	const netKop = gross - discountKop;
	const effectivePercent = gross > 0 ? Math.round((discountKop / gross) * 100) : 0;
	const discountRub = discountKop / 100;
	const netRub = netKop / 100;

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub,
		netRub,
		savingsText: `${discountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
	};
}

/**
 * Мандат 8e, п. 7: Свобода скидок и гарантийных переделок.
 * Если итог к оплате после 100% скидки равен 0 ₽:
 * - визит закрывается в 1 клик («Гарантийный прием / 100% скидка»)
 * - статус оплаты выставляется в «Оплачено (скидка 100%)»
 * - физический фискальный регистратор ограждается от вызова с суммой 0 (защита от ошибки ККТ «Сумма чека не может быть 0»)
 */
export function process100PercentDiscountCheckout(params: {
	readonly totalGrossRub: number;
	readonly discountPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly isStaffColleague?: boolean | undefined;
	readonly customDiscountRub?: number | undefined;
}): ZeroDiscountCheckoutResult {
	const is100Percent =
		Boolean(params.isWarrantyRework) ||
		Boolean(params.isStaffColleague) ||
		(typeof params.discountPercent === "number" && params.discountPercent >= 100);

	const calc = calculatePaymentDiscount(params.totalGrossRub, {
		isWarranty100: is100Percent,
		customDiscountRub: params.customDiscountRub,
		discountPercent: params.discountPercent,
	});

	const grossKop = rubToKopecks(calc.rawTotalDueRub);
	const discountKop = calc.discountKopecks;
	const netKop = calc.totalDueKopecks;
	const isZeroDue = netKop === 0;

	if (isZeroDue) {
		const bannerReason = params.isStaffColleague
			? "Лечение персонала / 100% скидка"
			: "Гарантийный прием / 100% скидка";
		return {
			isZeroDue: true,
			totalGrossRub: kopecksToRub(grossKop),
			totalDiscountRub: kopecksToRub(discountKop),
			totalNetRub: 0,
			totalNetKop: 0,
			status: "completed",
			paymentStatus: "Оплачено (скидка 100%)",
			statusBannerText: `${bannerReason} • Оплачено (скидка 100%)`,
			bypassKktZeroReceipt: true,
			fiscalSign: "WARRANTY-100-GUARANTEE",
			receiptDocNumber: 0,
		};
	}

	return {
		isZeroDue: false,
		totalGrossRub: kopecksToRub(grossKop),
		totalDiscountRub: kopecksToRub(discountKop),
		totalNetRub: kopecksToRub(netKop),
		totalNetKop: netKop,
		status: "ready_for_payment",
		paymentStatus: "Ожидает оплаты",
		statusBannerText: `К оплате: ${kopecksToRub(netKop).toLocaleString("ru-RU")} ₽`,
		bypassKktZeroReceipt: false,
		fiscalSign: "",
		receiptDocNumber: 0,
	};
}

export type TenderAllocationTarget =
	| "card"
	| "cash"
	| "sbp"
	| "deposit"
	| "family"
	| "certificate"
	| "bonus"
	| "card_and_cash_5050";

export interface MultiTenderStateRub {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly familyRub: number;
	readonly certificateRub?: number | undefined;
	readonly bonusRub?: number | undefined;
}

/**
 * Мандат 8e, п. 9: 1-тап кнопки «Оплатить остаток картой / налом / с депозита / через СБП / сертификатом / бонусами / 50/50».
 * Распределяет оставшуюся сумму до копейки без ручного ввода цифр.
 */
export function allocateRemainderToTender(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender: TenderAllocationTarget;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
}): MultiTenderStateRub {
	const totalKop = rubToKopecks(params.totalDueRub);

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += rubToKopecks(params.currentTenders.sbpRub);
		if (params.currentTenders.depositRub) nonCardCashKop += rubToKopecks(params.currentTenders.depositRub);
		if (params.currentTenders.familyRub) nonCardCashKop += rubToKopecks(params.currentTenders.familyRub);
		if (params.currentTenders.certificateRub) nonCardCashKop += rubToKopecks(params.currentTenders.certificateRub);
		if (params.currentTenders.bonusRub) nonCardCashKop += rubToKopecks(params.currentTenders.bonusRub);

		const remKop = Math.max(0, totalKop - nonCardCashKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;

		return {
			cardRub: kopecksToRub(halfCardKop),
			cashRub: kopecksToRub(halfCashKop),
			sbpRub: params.currentTenders.sbpRub,
			depositRub: params.currentTenders.depositRub,
			familyRub: params.currentTenders.familyRub,
			certificateRub: params.currentTenders.certificateRub || 0,
			bonusRub: params.currentTenders.bonusRub || 0,
		};
	}

	let otherKop = 0;
	if (params.targetTender !== "card") otherKop += rubToKopecks(params.currentTenders.cardRub);
	if (params.targetTender !== "cash") otherKop += rubToKopecks(params.currentTenders.cashRub);
	if (params.targetTender !== "sbp") otherKop += rubToKopecks(params.currentTenders.sbpRub);
	if (params.targetTender !== "deposit") otherKop += rubToKopecks(params.currentTenders.depositRub);
	if (params.targetTender !== "family") otherKop += rubToKopecks(params.currentTenders.familyRub);
	if (params.targetTender !== "certificate") otherKop += rubToKopecks(params.currentTenders.certificateRub || 0);
	if (params.targetTender !== "bonus") otherKop += rubToKopecks(params.currentTenders.bonusRub || 0);

	const rawRemKop = Math.max(0, totalKop - otherKop);

	let targetAllocatedKop = rawRemKop;

	if (params.targetTender === "deposit") {
		const maxDepKop = rubToKopecks(Math.max(0, params.patientDepositRub || 0));
		targetAllocatedKop = Math.min(rawRemKop, maxDepKop);
	} else if (params.targetTender === "family") {
		const maxFamKop = rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0));
		targetAllocatedKop = Math.min(rawRemKop, maxFamKop);
	} else if (params.targetTender === "certificate" && typeof params.availableCertificateRub === "number") {
		const maxCertKop = rubToKopecks(Math.max(0, params.availableCertificateRub));
		targetAllocatedKop = Math.min(rawRemKop, maxCertKop);
	} else if (params.targetTender === "bonus" && typeof params.availableBonusRub === "number") {
		const maxBonusKop = rubToKopecks(Math.max(0, params.availableBonusRub));
		targetAllocatedKop = Math.min(rawRemKop, maxBonusKop);
	}

	return {
		cardRub: params.targetTender === "card" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.certificateRub || 0),
		bonusRub: params.targetTender === "bonus" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.bonusRub || 0),
	};
}

export interface FastTenderPreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly tenders: MultiTenderStateRub;
}

/**
 * Генерация быстрых пресетов комбинированной оплаты в 1 клик.
 */
export function getFastCombinedTenderPresets(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
}): readonly FastTenderPreset[] {
	const totalDue = params.totalDueRub;
	const dep = Math.max(0, params.patientDepositRub || 0);
	const fam = Math.max(0, params.patientFamilyBalanceRub || 0);

	const presets: FastTenderPreset[] = [
		{
			id: "all_card",
			title: "100% Картой",
			description: "Вся сумма через POS-терминал",
			tenders: { cardRub: totalDue, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 },
		},
		{
			id: "all_cash",
			title: "100% Наличными",
			description: "Вся сумма в кассу наличными",
			tenders: { cardRub: 0, cashRub: totalDue, sbpRub: 0, depositRub: 0, familyRub: 0 },
		},
		{
			id: "all_sbp",
			title: "100% СБП (QR)",
			description: "Вся сумма по QR-коду СБП",
			tenders: { cardRub: 0, cashRub: 0, sbpRub: totalDue, depositRub: 0, familyRub: 0 },
		},
	];

	// 50% Карта / 50% Нал
	if (totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const halfKop = Math.floor(totalKop / 2);
		const otherKop = totalKop - halfKop;
		presets.push({
			id: "half_card_half_cash",
			title: "50% Карта / 50% Нал",
			description: `${kopecksToRub(halfKop)} ₽ картой + ${kopecksToRub(otherKop)} ₽ наличными`,
			tenders: {
				cardRub: kopecksToRub(halfKop),
				cashRub: kopecksToRub(otherKop),
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			},
		});
	}

	// Депозит + остаток картой
	if (dep > 0 && totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const depKop = Math.min(totalKop, rubToKopecks(dep));
		const remKop = Math.max(0, totalKop - depKop);
		presets.push({
			id: "deposit_plus_card",
			title: `Аванс (${kopecksToRub(depKop)} ₽) + Карта`,
			description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ картой`,
			tenders: {
				cardRub: kopecksToRub(remKop),
				cashRub: 0,
				sbpRub: 0,
				depositRub: kopecksToRub(depKop),
				familyRub: 0,
			},
		});

		// Депозит + остаток наличными
		presets.push({
			id: "deposit_plus_cash",
			title: `Аванс (${kopecksToRub(depKop)} ₽) + Нал`,
			description: `Списание аванса + остаток ${kopecksToRub(remKop)} ₽ наличными`,
			tenders: {
				cardRub: 0,
				cashRub: kopecksToRub(remKop),
				sbpRub: 0,
				depositRub: kopecksToRub(depKop),
				familyRub: 0,
			},
		});
	}

	// Семейный счет + остаток картой
	if (fam > 0 && totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const famKop = Math.min(totalKop, rubToKopecks(fam));
		const remKop = Math.max(0, totalKop - famKop);
		presets.push({
			id: "family_plus_card",
			title: `Семья (${kopecksToRub(famKop)} ₽) + Карта`,
			description: `Списание с семейного баланса + остаток ${kopecksToRub(remKop)} ₽ картой`,
			tenders: {
				cardRub: kopecksToRub(remKop),
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: kopecksToRub(famKop),
			},
		});
	}

	// Комбинированный сплит: Наличные + Карта + Аванс/Семья (3-way split) с копеечной точностью
	if ((dep > 0 || fam > 0) && totalDue > 0) {
		const totalKop = rubToKopecks(totalDue);
		const maxAdvKop = rubToKopecks(Math.max(dep, fam));
		const advKop = Math.min(totalKop, maxAdvKop);
		const remKop = Math.max(0, totalKop - advKop);
		const halfCardKop = Math.floor(remKop / 2);
		const halfCashKop = remKop - halfCardKop;
		const isFam = fam >= dep;

		presets.push({
			id: "family_cash_card_three_way",
			title: isFam ? `Семья (${kopecksToRub(advKop)} ₽) + Нал + Карта` : `Аванс (${kopecksToRub(advKop)} ₽) + Нал + Карта`,
			description: `${isFam ? "Семейный счет" : "Аванс"} ${kopecksToRub(advKop)} ₽ + ${kopecksToRub(halfCardKop)} ₽ картой + ${kopecksToRub(halfCashKop)} ₽ наличными`,
			tenders: {
				cardRub: kopecksToRub(halfCardKop),
				cashRub: kopecksToRub(halfCashKop),
				sbpRub: 0,
				depositRub: !isFam ? kopecksToRub(advKop) : 0,
				familyRub: isFam ? kopecksToRub(advKop) : 0,
			},
		});
	}

	return presets;
}

export interface CashChangeResult {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly changeRub: number;
	readonly changeKopecks: number;
	readonly shortageRub: number;
	readonly shortageKopecks: number;
	readonly isExact: boolean;
	readonly isExactWithoutChange: boolean;
	readonly isInsufficient: boolean;
	readonly isShortage: boolean;
}

/**
 * Расчёт сдачи при приёме наличных:
 * Если внесено ровно столько, сколько к оплате — режим «Без сдачи» (change = 0 ₽).
 */
export function calculateCashChange(totalDueRub: number, receivedCashRub: number): CashChangeResult {
	const dueKop = rubToKopecks(Math.max(0, totalDueRub));
	const recKop = rubToKopecks(Math.max(0, receivedCashRub));
	const isExact = recKop === dueKop;
	const isShortage = recKop < dueKop;
	const changeKop = isShortage ? 0 : recKop - dueKop;
	const shortageKop = isShortage ? dueKop - recKop : 0;
	return {
		totalDueRub: kopecksToRub(dueKop),
		receivedCashRub: kopecksToRub(recKop),
		changeRub: kopecksToRub(changeKop),
		changeKopecks: changeKop,
		shortageRub: kopecksToRub(shortageKop),
		shortageKopecks: shortageKop,
		isExact,
		isExactWithoutChange: isExact,
		isInsufficient: isShortage,
		isShortage,
	};
}

/**
 * 1-клик пресет «Без сдачи»: наличные = 100% сумме чека, сдача 0 ₽.
 */
export function createExactCashTenders(totalDueRub: number): MultiTenderStateRub {
	return {
		cardRub: 0,
		cashRub: totalDueRub,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	};
}

/**
 * 1-клик пресет «Оплата картой 100%».
 */
export function createFullCardTenders(totalDueRub: number): MultiTenderStateRub {
	return {
		cardRub: totalDueRub,
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	};
}

/**
 * 1-клик пресет «Комбинированная (Списать весь аванс + остаток картой)».
 */
export function createDepositAndCardComboTenders(totalDueRub: number, patientDepositRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const depKop = Math.min(totalKop, rubToKopecks(Math.max(0, patientDepositRub)));
	const cardKop = Math.max(0, totalKop - depKop);
	return {
		cardRub: kopecksToRub(cardKop),
		cashRub: 0,
		sbpRub: 0,
		depositRub: kopecksToRub(depKop),
		familyRub: 0,
	};
}

/**
 * 1-клик пресет «Сертификат + остаток картой»
 */
export function createCertificateAndCardComboTenders(totalDueRub: number, certificateRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const certKop = Math.min(totalKop, rubToKopecks(Math.max(0, certificateRub)));
	const cardKop = Math.max(0, totalKop - certKop);
	return {
		cardRub: kopecksToRub(cardKop),
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
		certificateRub: kopecksToRub(certKop),
		bonusRub: 0,
	};
}

/**
 * 1-клик пресет «Бонусы + остаток картой»
 */
export function createBonusAndCardComboTenders(totalDueRub: number, bonusRub: number): MultiTenderStateRub {
	const totalKop = rubToKopecks(Math.max(0, totalDueRub));
	const bonusKop = Math.min(totalKop, rubToKopecks(Math.max(0, bonusRub)));
	const cardKop = Math.max(0, totalKop - bonusKop);
	return {
		cardRub: kopecksToRub(cardKop),
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
		certificateRub: 0,
		bonusRub: kopecksToRub(bonusKop),
	};
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}

/**
 * 1-кликовая сплит-оплата: Комбинированный чек (наличные + карта + аванс/бонусы с семейного счета)
 * с автоматическим распределением остатка 50/50 между картой и наличными (Мандат 8e п. 9, 8b).
 * Гарантирует 100% копеечную точность без потерь и округлений (cardKop + cashKop + advanceKop === totalDueKop).
 */
export function calculateCombinedFamilyCashCardSplit(
	params: CombinedSplitCalculationParams,
): CombinedSplitCalculationResult {
	const totalKop = rubToKopecks(Math.max(0, params.totalDueRub));
	const depKop = rubToKopecks(Math.max(0, params.patientDepositRub || 0));
	const famKop = rubToKopecks(Math.max(0, params.patientFamilyBalanceRub || 0));
	const bonusKop = rubToKopecks(Math.max(0, params.availableBonusRub || 0));

	let advanceKop = 0;
	let advanceSource: "deposit" | "family" | "bonus" | "none" = "none";

	if (params.customAdvanceDeductionRub !== undefined && params.customAdvanceDeductionRub > 0) {
		const customKop = rubToKopecks(params.customAdvanceDeductionRub);
		const maxPossible = Math.max(depKop, famKop, bonusKop);
		advanceKop = Math.min(totalKop, Math.min(customKop, maxPossible));
		advanceSource = params.preferFamilyAccount && famKop > 0 ? "family" : depKop > 0 ? "deposit" : famKop > 0 ? "family" : "bonus";
	} else if (params.preferFamilyAccount && famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (depKop > 0) {
		advanceKop = Math.min(totalKop, depKop);
		advanceSource = "deposit";
	} else if (famKop > 0) {
		advanceKop = Math.min(totalKop, famKop);
		advanceSource = "family";
	} else if (bonusKop > 0) {
		advanceKop = Math.min(totalKop, bonusKop);
		advanceSource = "bonus";
	}

	const remKop = Math.max(0, totalKop - advanceKop);
	const cardKop = Math.floor(remKop / 2);
	const cashKop = remKop - cardKop;

	const tenders: MultiTenderStateRub = {
		cardRub: kopecksToRub(cardKop),
		cashRub: kopecksToRub(cashKop),
		sbpRub: 0,
		depositRub: advanceSource === "deposit" ? kopecksToRub(advanceKop) : 0,
		familyRub: advanceSource === "family" ? kopecksToRub(advanceKop) : 0,
		bonusRub: advanceSource === "bonus" ? kopecksToRub(advanceKop) : 0,
		certificateRub: 0,
	};

	const isPennyExact = cardKop + cashKop + advanceKop === totalKop;
	const advanceDesc =
		advanceKop > 0
			? `${advanceSource === "family" ? "Семейный счет" : advanceSource === "bonus" ? "Бонусы" : "Аванс"}: ${kopecksToRub(advanceKop)} ₽`
			: "Без аванса";

	const descriptionRu = `${advanceDesc} + Карта ${kopecksToRub(cardKop)} ₽ + Нал ${kopecksToRub(cashKop)} ₽`;

	return {
		totalDueRub: kopecksToRub(totalKop),
		totalDueKop: totalKop,
		advanceDeductedRub: kopecksToRub(advanceKop),
		advanceDeductedKop: advanceKop,
		advanceSource,
		remainderToPayRub: kopecksToRub(remKop),
		remainderToPayKop: remKop,
		cardRub: kopecksToRub(cardKop),
		cardKop,
		cashRub: kopecksToRub(cashKop),
		cashKop,
		tenders,
		isPennyExact,
		descriptionRu,
	};
}

/**
 * 1-клик генерация сплит-тендеров (Аванс / Семейный счет + 50/50 Нал и Карта).
 */
export function createThreeWaySplitTenders(params: {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamily?: boolean | undefined;
}): MultiTenderStateRub {
	const res = calculateCombinedFamilyCashCardSplit({
		totalDueRub: params.totalDueRub,
		patientDepositRub: params.patientDepositRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		availableBonusRub: params.availableBonusRub,
		preferFamilyAccount: params.preferFamily,
	});
	return res.tenders;
}

/**
 * Автоматическое распределение остатка к оплате на выбранный тендер (или 50/50 карта + нал),
 * гарантирующее строгое равенство суммы компонентов итоговому чеку до копейки (Mandate 8b).
 */
export function autoDistributeSplitRemainder(params: {
	readonly totalDueRub: number;
	readonly currentTenders: MultiTenderStateRub;
	readonly targetTender?: TenderAllocationTarget | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableCertificateRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
}): MultiTenderStateRub {
	const target = params.targetTender ?? "card_and_cash_5050";
	return allocateRemainderToTender({
		totalDueRub: params.totalDueRub,
		currentTenders: params.currentTenders,
		targetTender: target,
		patientDepositRub: params.patientDepositRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		availableCertificateRub: params.availableCertificateRub,
		availableBonusRub: params.availableBonusRub,
	});
}

/**
 * 1-клик пресет «Семейный счет + остаток картой»
 */
export function createFamilyCashCardComboTenders(params: {
	readonly totalDueRub: number;
	readonly patientFamilyBalanceRub: number;
}): MultiTenderStateRub {
	return calculateCombinedFamilyCashCardSplit({
		totalDueRub: params.totalDueRub,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub,
		preferFamilyAccount: true,
	}).tenders;
}

