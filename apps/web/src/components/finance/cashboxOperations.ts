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

export type PayerLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";

export interface BuyerInnValidationResult {
	readonly isValid: boolean;
	readonly isRequired: boolean;
	readonly errorRu?: string | undefined;
	readonly cleanInn?: string | undefined;
}

/**
 * 54-ФЗ Tag 1228: Валидация ИНН покупателя.
 * В частной стоматологии для физлиц ИНН КАТЕГОРИЧЕСКИ НЕ ТРЕБУЕТСЯ и никогда не блокирует оплату.
 */
export function validateBuyerInn54Fz(params: {
	readonly payerType?: PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): BuyerInnValidationResult {
	const payerType = params.payerType ?? "physical_person";
	const cleanInn = (params.buyerInn ?? "").trim().replace(/\D/g, "");

	if (payerType === "physical_person") {
		// Физическое лицо — ИНН строго опционален. Пустое поле всегда 100% валидно.
		if (!cleanInn) {
			return { isValid: true, isRequired: false };
		}
		// Если физлицо добровольно указало ИНН (например для справки об оплате 13% НДФЛ),
		// проверяем формат, но НИКОГДА не блокируем чек
		const isStandardLength = cleanInn.length === 12 || cleanInn.length === 10;
		return {
			isValid: true,
			isRequired: false,
			cleanInn,
			errorRu: isStandardLength
				? undefined
				: "ИНН физлица обычно состоит из 12 цифр (для 54-ФЗ поле опционально и не блокирует чек)",
		};
	}

	// B2B: Юридическое лицо или ИП
	if (!cleanInn) {
		return {
			isValid: false,
			isRequired: true,
			errorRu:
				payerType === "legal_entity"
					? "Для юридического лица обязателен ИНН (10 цифр) по 54-ФЗ"
					: "Для ИП обязателен ИНН (12 цифр) по 54-ФЗ",
		};
	}

	if (payerType === "legal_entity" && cleanInn.length !== 10) {
		return {
			isValid: false,
			isRequired: true,
			cleanInn,
			errorRu: "ИНН юридического лица должен содержать ровно 10 цифр",
		};
	}

	if (payerType === "individual_entrepreneur" && cleanInn.length !== 12) {
		return {
			isValid: false,
			isRequired: true,
			cleanInn,
			errorRu: "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр",
		};
	}

	return {
		isValid: true,
		isRequired: true,
		cleanInn,
	};
}

export type PayerType = "physical" | "legal_entity" | "physical_person" | "individual_entrepreneur";

/**
 * Облегченная обёртка валидации ИНН 54-ФЗ для модальных окон оплаты.
 */
export function validate54FzBuyerInn(
	buyerInn: string | undefined,
	payerType: PayerType = "physical",
): {
	readonly isValid: boolean;
	readonly isRequired: boolean;
	readonly cleanInn?: string | undefined;
	readonly errorMessage?: string | undefined;
	readonly errorRu?: string | undefined;
} {
	const clean = (buyerInn ?? "").trim().replace(/\D/g, "");
	const mappedLegalType: PayerLegalType =
		payerType === "legal_entity"
			? clean.length === 12
				? "individual_entrepreneur"
				: "legal_entity"
			: payerType === "individual_entrepreneur"
				? "individual_entrepreneur"
				: "physical_person";
	const res = validateBuyerInn54Fz({
		payerType: mappedLegalType,
		buyerInn,
	});
	return {
		isValid: res.isValid,
		isRequired: res.isRequired,
		cleanInn: res.cleanInn,
		errorMessage: res.errorRu,
		errorRu: res.errorRu,
	};
}

/**
 * Мандат 8e п. 9, 8n: Проверка блокировки кассовых действий из-за ИНН.
 * Для физических лиц (граждан) по ст. 4.7 № 54-ФЗ ИНН не требуется,
 * поэтому действие кассира/врача («Выбить чек», «Принять оплату») КАТЕГОРИЧЕСКИ НЕ БЛОКИРУЕТСЯ (всегда false).
 * Для юридических лиц и ИП блокировка активна при отсутствии или невалидном ИНН.
 */
export function isCashierActionBlockedByInn(params: {
	readonly payerType?: PayerType | PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): boolean {
	const pType = params.payerType ?? "physical_person";
	if (pType === "physical" || pType === "physical_person") {
		return false;
	}
	const res = validate54FzBuyerInn(params.buyerInn, pType);
	return !res.isValid;
}

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
	const grossKop = rubToKopecks(params.totalGrossRub);

	const is100Percent =
		Boolean(params.isWarrantyRework) ||
		Boolean(params.isStaffColleague) ||
		(typeof params.discountPercent === "number" && params.discountPercent >= 100);

	let discountKop = 0;
	if (is100Percent) {
		discountKop = grossKop;
	} else if (typeof params.customDiscountRub === "number" && params.customDiscountRub > 0) {
		discountKop = Math.min(grossKop, rubToKopecks(params.customDiscountRub));
	} else if (typeof params.discountPercent === "number" && params.discountPercent > 0) {
		const pct = Math.min(100, Math.max(0, params.discountPercent));
		discountKop = Math.round((grossKop * pct) / 100);
	}

	const netKop = Math.max(0, grossKop - discountKop);
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

