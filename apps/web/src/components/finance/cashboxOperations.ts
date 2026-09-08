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
	const mappedLegalType: PayerLegalType =
		payerType === "legal_entity"
			? "legal_entity"
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

export type TenderAllocationTarget = "card" | "cash" | "sbp" | "deposit" | "family" | "certificate" | "bonus";

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
 * Мандат 8e, п. 9: 1-тап кнопки «Оплатить остаток картой / налом / с депозита / через СБП / сертификатом / бонусами».
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
