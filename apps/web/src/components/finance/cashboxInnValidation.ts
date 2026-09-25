/**
 * cashboxInnValidation.ts
 *
 * DENTE Dental CRM — 54-FZ & FFD 1.2 Tag 1228 Buyer INN Validation.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: no disabled buttons, no obstacle INN for citizens)
 * - 54-FZ & FFD 1.2 Tag 1228 (Buyer INN strictly optional for physical persons, required only for B2B legal entities/IP)
 */

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
