/**
 * DENTE Dental CRM — 1-Click Fast Checkout Math & 54-FZ FFD 1.2 Payload Engine
 */

export {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
	type CheckoutPaymentMethodInfo,
} from "./fastCheckoutPresets";

import { type CheckoutPaymentMethodType } from "./fastCheckoutPresets";

export interface CheckoutSplitItem {
	readonly method: CheckoutPaymentMethodType;
	readonly amountKop: number;
}

export interface FastCheckoutSplitState {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly loyaltyRub: number;
	readonly dmsRub?: number | undefined;
}

export type ClientLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";

export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
	readonly idempotencyKey?: string | undefined;
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly isElectronicReceiptOnly?: boolean | undefined;
}

export interface TreatmentPlanStageOption {
	readonly id: string;
	readonly titleRu: string;
	readonly stageKind: string;
	readonly amountKop: number;
	readonly itemsCount: number;
}

export const DEFAULT_TREATMENT_STAGES: readonly TreatmentPlanStageOption[] = [
	{
		id: "full_plan",
		titleRu: "Весь план лечения (100%)",
		stageKind: "full",
		amountKop: 9400000,
		itemsCount: 3,
	},
	{
		id: "stage_1_therapy",
		titleRu: "Этап 1: Терапия (санация)",
		stageKind: "stage_1_therapy",
		amountKop: 400000,
		itemsCount: 1,
	},
	{
		id: "stage_2_surgery",
		titleRu: "Этап 2: Хирургия (имплантация)",
		stageKind: "stage_2_surgery",
		amountKop: 4500000,
		itemsCount: 1,
	},
	{
		id: "stage_3_orthopedics",
		titleRu: "Этап 3: Ортопедия (протезирование)",
		stageKind: "stage_3_orthopedics",
		amountKop: 4500000,
		itemsCount: 1,
	},
];

export type StagePaymentMode =
	| "full"
	| "advance_30"
	| "advance_50"
	| "advance_offset_tag1215";

export interface StageAdvanceCalculation {
	readonly mode: StagePaymentMode;
	readonly totalStageAmountKop: number;
	readonly requiredAmountKop: number;
	readonly advanceOffsetTag1215Kop: number;
	readonly remainingDueKop: number;
	readonly ffdTag1214: number; // Признак способа расчета (1 = предоплата 100%, 2 = частичная предоплата, 3 = аванс, 4 = полный расчет с зачетом аванса)
	readonly ffdTag1214NameRu: string;
	readonly ffdTag1212: number; // Признак предмета расчета (4 = услуга, 10 = платеж/аванс)
	readonly ffdTag1212NameRu: string;
	readonly isAdvanceReceipt: boolean;
	readonly isAdvanceOffsetReceipt: boolean;
}

export function calculateStageAdvanceAmount(
	stageAmountKop: number,
	mode: StagePaymentMode = "full",
	advanceAlreadyPaidKop = 0,
): StageAdvanceCalculation {
	const sanitizedStageKop = Math.max(0, stageAmountKop);
	const sanitizedPrevPaidKop = Math.max(0, advanceAlreadyPaidKop);

	switch (mode) {
		case "advance_30": {
			const requiredAmountKop = Math.round(sanitizedStageKop * 0.30);
			return {
				mode: "advance_30",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
				ffdTag1214: 2, // Частичная предоплата
				ffdTag1214NameRu: "Частичная предоплата (30%)",
				ffdTag1212: 4, // Услуга
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: true,
				isAdvanceOffsetReceipt: false,
			};
		}
		case "advance_50": {
			const requiredAmountKop = Math.round(sanitizedStageKop * 0.50);
			return {
				mode: "advance_50",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: Math.max(0, sanitizedStageKop - requiredAmountKop),
				ffdTag1214: 2, // Частичная предоплата
				ffdTag1214NameRu: "Частичная предоплата (50%)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: true,
				isAdvanceOffsetReceipt: false,
			};
		}
		case "advance_offset_tag1215": {
			const advanceOffsetTag1215Kop = Math.min(sanitizedPrevPaidKop, sanitizedStageKop);
			const requiredAmountKop = Math.max(0, sanitizedStageKop - advanceOffsetTag1215Kop);
			return {
				mode: "advance_offset_tag1215",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop,
				advanceOffsetTag1215Kop,
				remainingDueKop: 0,
				ffdTag1214: 4, // Полный расчет с зачетом аванса
				ffdTag1214NameRu: "Полный расчет с зачетом ранее внесенного аванса (Тег 1215)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга (этап лечения)",
				isAdvanceReceipt: false,
				isAdvanceOffsetReceipt: true,
			};
		}
		case "full":
		default: {
			return {
				mode: "full",
				totalStageAmountKop: sanitizedStageKop,
				requiredAmountKop: sanitizedStageKop,
				advanceOffsetTag1215Kop: 0,
				remainingDueKop: 0,
				ffdTag1214: 4, // Полный расчет
				ffdTag1214NameRu: "Полный расчет (100%)",
				ffdTag1212: 4,
				ffdTag1212NameRu: "Медицинская услуга",
				isAdvanceReceipt: false,
				isAdvanceOffsetReceipt: false,
			};
		}
	}
}

export interface BuyerInnValidationResult {
	readonly isValid: boolean;
	readonly isRequired: boolean;
	readonly errorRu?: string | undefined;
}

/**
 * Statutory 54-FZ Buyer INN validation rule:
 * - Физические лица (пациенты розницы): ИНН КАТЕГОРИЧЕСКИ НЕ ТРЕБУЕТСЯ по закону 54-ФЗ при оплате наличными или картой!
 *   Валидация отключена, поле строго опционально. Никаких препятствий и блокировок кассира.
 * - Юридические лица и индивидуальные предприниматели: ИНН обязателен (10 цифр для ЮЛ, 12 цифр для ИП) по ст. 4.7 № 54-ФЗ.
 */
export function validateBuyerInn(params: {
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): BuyerInnValidationResult {
	const clientType = params.clientType ?? "physical_person";

	if (clientType === "physical_person") {
		// Физическое лицо — ИНН строго опционален. Пустое поле 100% валидно.
		const cleanInn = (params.buyerInn ?? "").replace(/\D/g, "");
		if (!cleanInn) {
			return { isValid: true, isRequired: false };
		}
		// Если физлицо указало ИНН добровольно (например, для справки 13% НДФЛ в налоговую), проверяем корректность 12 цифр
		if (cleanInn.length !== 12) {
			return {
				isValid: false,
				isRequired: false,
				errorRu: "ИНН физического лица должен содержать 12 цифр (или оставьте поле пустым)",
			};
		}
		return { isValid: true, isRequired: false };
	}

	const cleanInn = (params.buyerInn ?? "").replace(/\D/g, "");
	if (!cleanInn) {
		return {
			isValid: false,
			isRequired: true,
			errorRu:
				clientType === "legal_entity"
					? "Для юридического лица обязателен ИНН (10 цифр) по 54-ФЗ"
					: "Для индивидуального предпринимателя обязателен ИНН (12 цифр) по 54-ФЗ",
		};
	}

	if (clientType === "legal_entity" && cleanInn.length !== 10) {
		return {
			isValid: false,
			isRequired: true,
			errorRu: "ИНН юридического лица должен содержать ровно 10 цифр",
		};
	}

	if (clientType === "individual_entrepreneur" && cleanInn.length !== 12) {
		return {
			isValid: false,
			isRequired: true,
			errorRu: "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр",
		};
	}

	return { isValid: true, isRequired: true };
}

export type QuickCheckoutPresetType =
	| "100_card"
	| "100_cash"
	| "100_sbp"
	| "use_deposit"
	| "deposit_cash"
	| "deposit_sbp"
	| "split_50_50"
	| "split_three_way";

export interface QuickCheckoutPresetResult {
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop: number;
	readonly activeMethod: CheckoutPaymentMethodType;
}

/**
 * 1-Click Quick Preset Engine (Mandate 8e — zero cashier friction):
 * - 100_card: 100% банковской картой (Тег 1081)
 * - 100_cash: 100% наличными (Тег 1031) с точной суммой без сдачи
 * - 100_sbp: 100% СБП QR (Тег 1081)
 * - use_deposit: Списание депозита/аванса (Тег 1215) с доплатой картой при нехватке
 * - deposit_cash: Списание депозита/аванса (Тег 1215) с доплатой наличными
 * - deposit_sbp: Списание депозита/аванса (Тег 1215) с доплатой через СБП QR
 * - split_50_50: Сплит 50/50 (Карта + Наличные) с точностью до копейки без дрейфа float
 * - split_three_way: Депозит + 50/50 Карта и Наличные
 */
export function applyQuickCheckoutPreset(params: {
	readonly totalBillKop: number;
	readonly preset: QuickCheckoutPresetType;
	readonly availableDepositKop?: number | undefined;
}): QuickCheckoutPresetResult {
	const total = Math.max(0, params.totalBillKop);
	const availableDeposit = Math.max(0, params.availableDepositKop ?? 0);

	switch (params.preset) {
		case "100_card": {
			return {
				payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [],
				cashTenderedKop: 0,
				activeMethod: "bank_card",
			};
		}
		case "100_cash": {
			return {
				payments: total > 0 ? [{ method: "cash", amountKop: total }] : [],
				cashTenderedKop: total,
				activeMethod: "cash",
			};
		}
		case "100_sbp": {
			return {
				payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [],
				cashTenderedKop: 0,
				activeMethod: "sbp_qr",
			};
		}
		case "use_deposit": {
			if (availableDeposit >= total && total > 0) {
				return {
					payments: [{ method: "patient_deposit", amountKop: total }],
					cashTenderedKop: 0,
					activeMethod: "patient_deposit",
				};
			}
			if (availableDeposit > 0 && total > availableDeposit) {
				const remainderKop = total - availableDeposit;
				return {
					payments: [
						{ method: "patient_deposit", amountKop: availableDeposit },
						{ method: "bank_card", amountKop: remainderKop },
					],
					cashTenderedKop: 0,
					activeMethod: "patient_deposit",
				};
			}
			return {
				payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [],
				cashTenderedKop: 0,
				activeMethod: "bank_card",
			};
		}
		case "deposit_cash": {
			if (availableDeposit >= total && total > 0) {
				return {
					payments: [{ method: "patient_deposit", amountKop: total }],
					cashTenderedKop: 0,
					activeMethod: "patient_deposit",
				};
			}
			if (availableDeposit > 0 && total > availableDeposit) {
				const remainderKop = total - availableDeposit;
				return {
					payments: [
						{ method: "patient_deposit", amountKop: availableDeposit },
						{ method: "cash", amountKop: remainderKop },
					],
					cashTenderedKop: remainderKop,
					activeMethod: "cash",
				};
			}
			return {
				payments: total > 0 ? [{ method: "cash", amountKop: total }] : [],
				cashTenderedKop: total,
				activeMethod: "cash",
			};
		}
		case "deposit_sbp": {
			if (availableDeposit >= total && total > 0) {
				return {
					payments: [{ method: "patient_deposit", amountKop: total }],
					cashTenderedKop: 0,
					activeMethod: "patient_deposit",
				};
			}
			if (availableDeposit > 0 && total > availableDeposit) {
				const remainderKop = total - availableDeposit;
				return {
					payments: [
						{ method: "patient_deposit", amountKop: availableDeposit },
						{ method: "sbp_qr", amountKop: remainderKop },
					],
					cashTenderedKop: 0,
					activeMethod: "sbp_qr",
				};
			}
			return {
				payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [],
				cashTenderedKop: 0,
				activeMethod: "sbp_qr",
			};
		}
		case "split_50_50": {
			const halfCardKop = Math.floor(total / 2);
			const halfCashKop = total - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (halfCardKop > 0) {
				payments.push({ method: "bank_card", amountKop: halfCardKop });
			}
			if (halfCashKop > 0) {
				payments.push({ method: "cash", amountKop: halfCashKop });
			}
			return {
				payments,
				cashTenderedKop: halfCashKop,
				activeMethod: "bank_card",
			};
		}
		case "split_three_way": {
			const usedDepositKop = Math.min(availableDeposit, total);
			const remainderKop = Math.max(0, total - usedDepositKop);
			const halfCardKop = Math.floor(remainderKop / 2);
			const halfCashKop = remainderKop - halfCardKop;
			const payments: CheckoutSplitItem[] = [];

			if (usedDepositKop > 0) {
				payments.push({ method: "patient_deposit", amountKop: usedDepositKop });
			}
			if (halfCardKop > 0) {
				payments.push({ method: "bank_card", amountKop: halfCardKop });
			}
			if (halfCashKop > 0) {
				payments.push({ method: "cash", amountKop: halfCashKop });
			}

			return {
				payments,
				cashTenderedKop: halfCashKop,
				activeMethod: usedDepositKop > 0 ? "patient_deposit" : "bank_card",
			};
		}
	}
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
 * - round_hundreds: rounds bill down to hundreds of rubles in favor of the patient
 * - warranty_100: 100% warranty rework discount (due 0 ₽) without admin passwords
 * - colleague_100: 100% staff / doctor treatment (due 0 ₽)
 */
export function calculateFastCheckoutDiscount(params: {
	readonly grossKop: number;
	readonly preset: FastCheckoutDiscountPreset;
	readonly customPercent?: number | undefined;
}): FastCheckoutDiscountResult {
	const gross = Math.max(0, params.grossKop);
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
		discountKop = Math.round(gross * 0.03);
	} else if (params.preset === "discount_5") {
		discountKop = Math.round(gross * 0.05);
	} else if (params.preset === "discount_10") {
		discountKop = Math.round(gross * 0.10);
	} else if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		discountKop = gross;
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		discountKop = Math.round((gross * pct) / 100);
	}

	discountKop = Math.max(0, Math.min(gross, discountKop));
	const netKop = gross - discountKop;
	const effectivePercent = gross > 0 ? Math.round((discountKop / gross) * 100) : 0;

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub: discountKop / 100,
		netRub: netKop / 100,
		savingsText: `${(discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
	};
}

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export interface Ffd12FiscalPayload {
	readonly ffdVersion: "1.2";
	readonly orderId: string;
	readonly idempotencyKey?: string | undefined;
	readonly totalSumKop: number;
	readonly paymentMethodTag1214: number; // Тег 1214 (Признак способа расчета)
	readonly paymentSubjectTag1212: number; // Тег 1212 (Признак предмета расчета)
	readonly paymentsDistribution: {
		readonly cashKop: number; // Тег 1031
		readonly electronicKop: number; // Тег 1081
		readonly advancePrepaymentKop: number; // Тег 1215 (Зачет аванса / предоплаты)
		readonly creditKop: number; // Тег 1216
		readonly barterOtherKop: number; // Тег 1217
	};
	readonly clientContact?: string | undefined; // Тег 1008
	readonly isElectronicReceiptOnly: boolean; // Отказ от бумажного чека по ст. 1.2 54-ФЗ
	readonly clientType: ClientLegalType;
	readonly buyerInn?: string | undefined; // Тег 1228 (только ЮЛ/ИП)
	readonly buyerName?: string | undefined; // Тег 1227
	readonly taxSystem: string;
	readonly calculationType: 1;
	readonly offlineBuffered?: boolean | undefined;
}

/**
 * Converts rubles split state to strongly-typed kopeck payments list.
 */
export function splitStateToCheckoutPayments(
	split: Partial<FastCheckoutSplitState>,
): CheckoutSplitItem[] {
	const items: CheckoutSplitItem[] = [];
	const cardKop = Math.round(Math.max(0, split.cardRub ?? 0) * 100);
	const cashKop = Math.round(Math.max(0, split.cashRub ?? 0) * 100);
	const sbpKop = Math.round(Math.max(0, split.sbpRub ?? 0) * 100);
	const depositKop = Math.round(Math.max(0, split.depositRub ?? 0) * 100);
	const loyaltyKop = Math.round(Math.max(0, split.loyaltyRub ?? 0) * 100);
	const dmsKop = Math.round(Math.max(0, split.dmsRub ?? 0) * 100);

	if (cardKop > 0) items.push({ method: "bank_card", amountKop: cardKop });
	if (cashKop > 0) items.push({ method: "cash", amountKop: cashKop });
	if (sbpKop > 0) items.push({ method: "sbp_qr", amountKop: sbpKop });
	if (depositKop > 0) items.push({ method: "patient_deposit", amountKop: depositKop });
	if (loyaltyKop > 0) items.push({ method: "loyalty_points", amountKop: loyaltyKop });
	if (dmsKop > 0) items.push({ method: "dms_insurance", amountKop: dmsKop });

	return items;
}

/**
 * Converts payments list back to split state in rubles with 2-decimal rounding.
 */
export function paymentsToSplitState(
	payments: readonly CheckoutSplitItem[],
): FastCheckoutSplitState {
	let cardRub = 0;
	let cashRub = 0;
	let sbpRub = 0;
	let depositRub = 0;
	let loyaltyRub = 0;
	let dmsRub = 0;

	for (const p of payments) {
		const rub = p.amountKop / 100;
		switch (p.method) {
			case "bank_card":
				cardRub += rub;
				break;
			case "cash":
				cashRub += rub;
				break;
			case "sbp_qr":
				sbpRub += rub;
				break;
			case "patient_deposit":
				depositRub += rub;
				break;
			case "loyalty_points":
				loyaltyRub += rub;
				break;
			case "dms_insurance":
				dmsRub += rub;
				break;
		}
	}

	return {
		cardRub: +cardRub.toFixed(2),
		cashRub: +cashRub.toFixed(2),
		sbpRub: +sbpRub.toFixed(2),
		depositRub: +depositRub.toFixed(2),
		loyaltyRub: +loyaltyRub.toFixed(2),
		dmsRub: +dmsRub.toFixed(2),
	};
}

/**
 * Calculates remaining unallocated kopecks between total bill and current payments.
 */
export function calculateSplitRemainingKop(
	totalBillKop: number,
	payments: readonly CheckoutSplitItem[],
): number {
	const totalPaidKop = payments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	return totalBillKop - totalPaidKop;
}

/**
 * 1-Click Remainder Balancer: allocates whatever is left directly to targetMethod.
 */
export function balanceRemainderToSplitMethod(params: {
	readonly totalBillKop: number;
	readonly currentPayments: readonly CheckoutSplitItem[];
	readonly targetMethod: CheckoutPaymentMethodType;
}): readonly CheckoutSplitItem[] {
	const sanitizedTotal = Math.max(0, params.totalBillKop);
	const otherPayments = params.currentPayments.filter((p) => p.method !== params.targetMethod);
	const otherSumKop = otherPayments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	const remainingForTargetKop = Math.max(0, sanitizedTotal - otherSumKop);

	const result: CheckoutSplitItem[] = [...otherPayments];
	if (remainingForTargetKop > 0) {
		result.push({
			method: params.targetMethod,
			amountKop: remainingForTargetKop,
		});
	}
	return result;
}

export interface CashChangeCalculation {
	readonly cashTenderedKop: number;
	readonly cashRequiredKop: number;
	readonly changeDueKop: number;
	readonly isUnderpaid: boolean;
	readonly missingKop: number;
}

/**
 * Exact cash change calculation down to kopecks.
 */
export function calculateCashChangeKop(
	cashTenderedKop: number,
	cashRequiredKop: number,
): CashChangeCalculation {
	const sanitizedTendered = Math.max(0, cashTenderedKop);
	const sanitizedRequired = Math.max(0, cashRequiredKop);

	if (sanitizedRequired === 0) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: 0,
			changeDueKop: sanitizedTendered,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	if (sanitizedTendered >= sanitizedRequired) {
		return {
			cashTenderedKop: sanitizedTendered,
			cashRequiredKop: sanitizedRequired,
			changeDueKop: sanitizedTendered - sanitizedRequired,
			isUnderpaid: false,
			missingKop: 0,
		};
	}

	return {
		cashTenderedKop: sanitizedTendered,
		cashRequiredKop: sanitizedRequired,
		changeDueKop: 0,
		isUnderpaid: true,
		missingKop: sanitizedRequired - sanitizedTendered,
	};
}

export function validateCheckoutSplit(input: FastCheckoutInput): FastCheckoutValidationResult {
	const innValidation = validateBuyerInn({
		clientType: input.clientType,
		buyerInn: input.buyerInn,
	});

	if (!innValidation.isValid && innValidation.errorRu) {
		return {
			isValid: false,
			totalPaidKop: 0,
			totalBillKop: input.totalBillKop,
			remainingDueKop: input.totalBillKop,
			cashChangeDueKop: 0,
			errorMessageRu: innValidation.errorRu,
		};
	}

	let totalPaid = 0;
	let cashAmount = 0;

	for (const p of input.payments) {
		totalPaid += p.amountKop;
		if (p.method === "cash") {
			cashAmount += p.amountKop;
		}
	}

	const remaining = input.totalBillKop - totalPaid;
	let cashChange = 0;

	if (cashAmount > 0 && input.cashTenderedKop !== undefined && input.cashTenderedKop > cashAmount) {
		cashChange = input.cashTenderedKop - cashAmount;
	}

	if (remaining > 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Недоплата: " + (remaining / 100).toFixed(2) + " ₽",
		};
	}

	if (remaining < 0) {
		return {
			isValid: false,
			totalPaidKop: totalPaid,
			totalBillKop: input.totalBillKop,
			remainingDueKop: remaining,
			cashChangeDueKop: 0,
			errorMessageRu: "Переплата по безналу/сертификатам: " + (Math.abs(remaining) / 100).toFixed(2) + " ₽",
		};
	}

	return {
		isValid: true,
		totalPaidKop: totalPaid,
		totalBillKop: input.totalBillKop,
		remainingDueKop: 0,
		cashChangeDueKop: cashChange,
	};
}

export function generate54FzFiscalPayload(
	input: FastCheckoutInput,
	options?: {
		paymentMethodTag1214?: number | undefined;
		paymentSubjectTag1212?: number | undefined;
		idempotencyKey?: string | undefined;
		isElectronicReceiptOnly?: boolean | undefined;
		offlineBuffered?: boolean | undefined;
	},
): Ffd12FiscalPayload {
	let cashKop = 0;
	let electronicKop = 0;
	let advancePrepaymentKop = 0;
	let creditKop = 0;
	let barterOtherKop = 0;

	for (const p of input.payments) {
		switch (p.method) {
			case "cash":
				cashKop += p.amountKop;
				break;
			case "bank_card":
			case "sbp_qr":
				electronicKop += p.amountKop;
				break;
			case "patient_deposit":
				advancePrepaymentKop += p.amountKop;
				break;
			case "dms_insurance":
				creditKop += p.amountKop;
				break;
			case "loyalty_points":
				barterOtherKop += p.amountKop;
				break;
		}
	}

	const contact = input.patientPhone || input.patientEmail || undefined;
	const isElectronicReceiptOnly = Boolean(
		options?.isElectronicReceiptOnly ?? input.isElectronicReceiptOnly ?? false,
	);
	const clientType = input.clientType ?? "physical_person";
	const cleanBuyerInn = input.buyerInn?.replace(/\D/g, "");

	return {
		ffdVersion: "1.2",
		orderId: input.orderId,
		idempotencyKey: options?.idempotencyKey ?? input.idempotencyKey ?? undefined,
		totalSumKop: input.totalBillKop,
		paymentMethodTag1214: options?.paymentMethodTag1214 ?? (advancePrepaymentKop > 0 ? 4 : 4),
		paymentSubjectTag1212: options?.paymentSubjectTag1212 ?? 4,
		paymentsDistribution: {
			cashKop,
			electronicKop,
			advancePrepaymentKop,
			creditKop,
			barterOtherKop,
		},
		clientContact: contact,
		isElectronicReceiptOnly,
		clientType,
		buyerInn: cleanBuyerInn || undefined,
		buyerName: input.buyerName?.trim() || undefined,
		taxSystem: input.taxSystem || "usn_income_outcome",
		calculationType: 1,
		offlineBuffered: options?.offlineBuffered ?? false,
	};
}

export interface OfflineFiscalBufferItem {
	readonly orderId: string;
	readonly totalRub: number;
	readonly totalKop: number;
	readonly paymentsDistribution: Ffd12FiscalPayload["paymentsDistribution"];
	readonly customerContact: string;
	readonly isElectronicReceiptOnly: boolean;
	readonly idempotencyKey: string;
	readonly clientType: ClientLegalType;
	readonly buyerInn?: string | undefined;
	readonly queuedAt: string;
	readonly reason: string;
}

/**
 * Creates an offline fiscal buffer record when KKT hardware is offline,
 * ensuring zero patient wait time at the reception counter (Mandate 8e).
 */
export function createOfflineFiscalBufferItem(
	payload: Ffd12FiscalPayload,
	reason = "ККТ временно недоступна (автосохранение в буфер отложенной фискализации)",
): OfflineFiscalBufferItem {
	return {
		orderId: payload.orderId,
		totalRub: payload.totalSumKop / 100,
		totalKop: payload.totalSumKop,
		paymentsDistribution: payload.paymentsDistribution,
		customerContact: payload.clientContact || "",
		isElectronicReceiptOnly: payload.isElectronicReceiptOnly,
		idempotencyKey: payload.idempotencyKey || `offline-${Date.now()}`,
		clientType: payload.clientType,
		buyerInn: payload.buyerInn,
		queuedAt: new Date().toISOString(),
		reason,
	};
}
