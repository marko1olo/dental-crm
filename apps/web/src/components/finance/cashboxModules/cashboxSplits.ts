/**
 * cashboxSplits.ts — Layer 1 & 2: Kopeck-Exact Multi-Tender Splits, Change & Cash Drawer Allocation.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: 1-click tender allocation, no manual math friction)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	CashChangeResult,
	CombinedSplitCalculationParams,
	CombinedSplitCalculationResult,
	FastTenderPreset,
	MultiTenderStateRub,
	TenderAllocationTarget,
} from "./cashboxTypes.js";

/**
 * Мандат 8e, п. 9: распределение остатка: «Оплатить остаток картой / налом / с депозита / через СБП / сертификатом / бонусами / ДМС / 50/50».
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
	readonly availableDmsCoverageRub?: number | undefined;
}): MultiTenderStateRub {
	const totalKop = rubToKopecks(params.totalDueRub);

	if (params.targetTender === "card_and_cash_5050") {
		let nonCardCashKop = 0;
		if (params.currentTenders.sbpRub) nonCardCashKop += rubToKopecks(params.currentTenders.sbpRub);
		if (params.currentTenders.depositRub) nonCardCashKop += rubToKopecks(params.currentTenders.depositRub);
		if (params.currentTenders.familyRub) nonCardCashKop += rubToKopecks(params.currentTenders.familyRub);
		if (params.currentTenders.certificateRub) nonCardCashKop += rubToKopecks(params.currentTenders.certificateRub);
		if (params.currentTenders.bonusRub) nonCardCashKop += rubToKopecks(params.currentTenders.bonusRub);
		if (params.currentTenders.dmsRub) nonCardCashKop += rubToKopecks(params.currentTenders.dmsRub);

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
			dmsRub: params.currentTenders.dmsRub || 0,
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
	if (params.targetTender !== "dms") otherKop += rubToKopecks(params.currentTenders.dmsRub || 0);

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
	} else if (params.targetTender === "dms" && typeof params.availableDmsCoverageRub === "number") {
		const maxDmsKop = rubToKopecks(Math.max(0, params.availableDmsCoverageRub));
		targetAllocatedKop = Math.min(rawRemKop, maxDmsKop);
	}

	return {
		cardRub: params.targetTender === "card" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cardRub,
		cashRub: params.targetTender === "cash" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.cashRub,
		sbpRub: params.targetTender === "sbp" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.sbpRub,
		depositRub: params.targetTender === "deposit" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.depositRub,
		familyRub: params.targetTender === "family" ? kopecksToRub(targetAllocatedKop) : params.currentTenders.familyRub,
		certificateRub: params.targetTender === "certificate" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.certificateRub || 0),
		bonusRub: params.targetTender === "bonus" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.bonusRub || 0),
		dmsRub: params.targetTender === "dms" ? kopecksToRub(targetAllocatedKop) : (params.currentTenders.dmsRub || 0),
	};
}

/**
 * Генерация быстрых пресетов комбинированной оплаты.
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

/**
 * Расчёт сдачи при приёме наличных:
 * Если внесено ровно столько, сколько к оплате — режим «Без сдачи» (change = 0 ₽).
 */
export function calculateCashChange(totalDueRub: number, receivedCashRub: number): CashChangeResult {
	const safeDueRub = Number.isFinite(totalDueRub) ? Math.max(0, totalDueRub) : 0;
	const safeRecRub = Number.isFinite(receivedCashRub) ? Math.max(0, receivedCashRub) : 0;
	const dueKop = rubToKopecks(safeDueRub);
	const recKop = rubToKopecks(safeRecRub);
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
 * Пресет «Без сдачи»: наличные = 100% сумме чека, сдача 0 ₽.
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
 * Пресет «Оплата картой 100%».
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
 * Пресет «Комбинированная оплата (Списать весь аванс + остаток картой)».
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
 * Пресет «Комбинированная оплата: Сертификат + остаток картой».
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
 * Пресет «Комбинированная оплата: Бонусы + остаток картой».
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

/**
 * Комбинированная оплата: расчет сплит-чека (наличные + карта + аванс/бонусы с семейного счета)
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
 * Распределение комбинированной оплаты (Аванс / Семейный счет + 50/50 Нал и Карта).
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
 * Пресет «Комбинированная оплата: Семейный счет + остаток картой».
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
