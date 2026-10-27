/**
 * cashboxInnValidation.ts — Кассовая валидация ИНН покупателя (Buyer INN Validation).
 * Мандаты 8b (лимит строк), 8e (Автономия кассира/врача), 8n (соло-практика), 8ap (без законов в названиях).
 * Для физлиц-пациентов ИНН СТРОГО опционален и НИКОГДА не блокирует кассовые действия.
 */

export type PayerLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";
export type PayerType = "physical" | "legal_entity" | "physical_person" | "individual_entrepreneur";

export interface BuyerInnValidationResult {
	readonly isValid: boolean;
	readonly isRequired: boolean;
	readonly errorRu?: string | undefined;
	readonly errorMessage?: string | undefined;
	readonly cleanInn?: string | undefined;
}

/**
 * Валидация ИНН покупателя: физлица свободны от блокировок (Мандаты 8e, 8n).
 */
export function validateBuyerInn(params: {
	readonly payerType?: PayerType | PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): BuyerInnValidationResult {
	const rawType = params.payerType ?? "physical_person";
	const cleanInn = (params.buyerInn ?? "").trim().replace(/\D/g, "");
	const isPhysical = rawType === "physical" || rawType === "physical_person";

	if (isPhysical) {
		if (!cleanInn) return { isValid: true, isRequired: false };
		const isStd = cleanInn.length === 12 || cleanInn.length === 10;
		const hint = isStd ? undefined : "ИНН физлица обычно содержит 12 цифр (для 54-ФЗ поле опционально и не блокирует чек)";
		return { isValid: true, isRequired: false, cleanInn, errorRu: hint, errorMessage: hint };
	}

	const isLegal = rawType === "legal_entity";
	const isIp = rawType === "individual_entrepreneur";

	if (!cleanInn) {
		const msg = isLegal ? "Для организации обязателен ИНН (10 цифр)" : "Для ИП обязателен ИНН (12 цифр)";
		return { isValid: false, isRequired: true, errorRu: msg, errorMessage: msg };
	}

	if (isLegal && cleanInn.length !== 10 && cleanInn.length !== 12) {
		const msg = "ИНН юридического лица или ИП должен содержать 10 или 12 цифр";
		return { isValid: false, isRequired: true, cleanInn, errorRu: msg, errorMessage: msg };
	}

	if (isIp && cleanInn.length !== 12) {
		const msg = "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр";
		return { isValid: false, isRequired: true, cleanInn, errorRu: msg, errorMessage: msg };
	}

	return { isValid: true, isRequired: true, cleanInn };
}

export function validateBuyerInnShort(buyerInn: string | undefined, payerType: PayerType = "physical"): BuyerInnValidationResult {
	return validateBuyerInn({ buyerInn, payerType });
}

export function isCashierActionBlockedByInn(params: {
	readonly payerType?: PayerType | PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): boolean {
	const pType = params.payerType ?? "physical_person";
	if (pType === "physical" || pType === "physical_person") return false;
	return !validateBuyerInn({ payerType: pType, buyerInn: params.buyerInn }).isValid;
}

// Алиасы обратной совместимости (Мандат 8ap)
export const validateBuyerInn54Fz = validateBuyerInn;
export const validate54FzBuyerInn = validateBuyerInnShort;
