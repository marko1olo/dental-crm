/**
 * cashboxInnValidation.ts
 *
 * DENTE Dental CRM — Кассовая валидация ИНН покупателя (Buyer INN Validation).
 * Соответствует:
 * - Мандат 8e (Автономия врача и персонала: запрет блокировки кнопок «Оплатить» / «Выбить чек»)
 * - Мандат 8n (Касса без палок в колёса: для физлиц-пациентов ИНН СТРОГО опционален)
 * - Мандат 8ap (Запрет номеров законов в названиях функций и типов)
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
 * Каноническая функция валидации ИНН покупателя (Мандаты 8e, 8n, 8ap).
 * В частной стоматологии для физлиц ИНН КАТЕГОРИЧЕСКИ НЕ ТРЕБУЕТСЯ и никогда не блокирует оплату.
 * Обязателен ИСКЛЮЧИТЕЛЬНО для юридических лиц (10 цифр) и ИП (12 цифр).
 */
export function validateBuyerInn(params: {
	readonly payerType?: PayerType | PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): BuyerInnValidationResult {
	const rawPayerType = params.payerType ?? "physical_person";
	const cleanInn = (params.buyerInn ?? "").trim().replace(/\D/g, "");

	const isPhysical = rawPayerType === "physical" || rawPayerType === "physical_person";

	if (isPhysical) {
		// Физическое лицо — ИНН строго опционален. Пустое поле всегда 100% валидно.
		if (!cleanInn) {
			return { isValid: true, isRequired: false };
		}
		// Если физлицо добровольно указало ИНН (например, для справки на налоговый вычет 13%),
		// проверяем длину, но НИКОГДА не блокируем чек
		const isStandardLength = cleanInn.length === 12 || cleanInn.length === 10;
		const hint = isStandardLength
			? undefined
			: "ИНН физлица обычно содержит 12 цифр (поле опционально и не блокирует чек)";
		return {
			isValid: true,
			isRequired: false,
			cleanInn,
			errorRu: hint,
			errorMessage: hint,
		};
	}

	// B2B: Юридическое лицо или Индивидуальный предприниматель
	const isLegalEntity = rawPayerType === "legal_entity";
	const isIp = rawPayerType === "individual_entrepreneur";

	if (!cleanInn) {
		const msg = isLegalEntity
			? "Для организации обязателен ИНН (10 цифр)"
			: "Для ИП обязателен ИНН (12 цифр)";
		return {
			isValid: false,
			isRequired: true,
			errorRu: msg,
			errorMessage: msg,
		};
	}

	if (isLegalEntity && cleanInn.length !== 10) {
		const msg = "ИНН юридического лица должен содержать ровно 10 цифр";
		return {
			isValid: false,
			isRequired: true,
			cleanInn,
			errorRu: msg,
			errorMessage: msg,
		};
	}

	if (isIp && cleanInn.length !== 12) {
		const msg = "ИНН индивидуального предпринимателя должен содержать ровно 12 цифр";
		return {
			isValid: false,
			isRequired: true,
			cleanInn,
			errorRu: msg,
			errorMessage: msg,
		};
	}

	return {
		isValid: true,
		isRequired: true,
		cleanInn,
	};
}

/**
 * Облегченная обёртка валидации ИНН покупателя.
 */
export function validateBuyerInnShort(
	buyerInn: string | undefined,
	payerType: PayerType = "physical",
): BuyerInnValidationResult {
	return validateBuyerInn({ buyerInn, payerType });
}

/**
 * Проверка блокировки кассовых действий из-за ИНН (Мандаты 8e, 8n).
 * Для граждан (физических лиц) оплата НИКОГДА не блокируется (всегда false).
 * Для B2B блокировка срабатывает только при отсутствии обязательного ИНН организации.
 */
export function isCashierActionBlockedByInn(params: {
	readonly payerType?: PayerType | PayerLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): boolean {
	const pType = params.payerType ?? "physical_person";
	if (pType === "physical" || pType === "physical_person") {
		return false;
	}
	const res = validateBuyerInn({ payerType: pType, buyerInn: params.buyerInn });
	return !res.isValid;
}

// Алиасы обратной совместимости (Мандат 8ap)
export const validateBuyerInn54Fz = validateBuyerInn;
export const validate54FzBuyerInn = validateBuyerInnShort;
