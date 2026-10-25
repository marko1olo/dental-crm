import type { ClientLegalType, BuyerInnValidationResult } from "./types.js";

/**
 * Валидация ИНН покупателя (Мандаты 8e и 8n):
 * - Физические лица: ИНН КАТЕГОРИЧЕСКИ НЕ ТРЕБУЕТСЯ при оплате. Поле строго опционально.
 *   Никаких препятствий и блокировок кассира/врача.
 * - Юридические лица и ИП: ИНН обязателен (10 цифр для ЮЛ, 12 для ИП).
 */
export function validateBuyerInn(params: {
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
}): BuyerInnValidationResult {
	const clientType = params.clientType ?? "physical_person";

	if (clientType === "physical_person") {
		const cleanInn = (params.buyerInn ?? "").replace(/\D/g, "");
		if (!cleanInn) {
			return { isValid: true, isRequired: false };
		}
		return {
			isValid: true,
			isRequired: false,
			errorRu:
				cleanInn.length !== 12 && cleanInn.length !== 10
					? "ИНН физического лица содержит 12 цифр (для чека поле опционально и не блокирует оплату)"
					: undefined,
		};
	}

	const cleanInn = (params.buyerInn ?? "").replace(/\D/g, "");
	if (!cleanInn) {
		return {
			isValid: false,
			isRequired: true,
			errorRu:
				clientType === "legal_entity"
					? "Для юридического лица обязателен ИНН (10 цифр)"
					: "Для индивидуального предпринимателя обязателен ИНН (12 цифр)",
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
