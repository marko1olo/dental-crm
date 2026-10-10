/**
 * Регулярные выражения и алгоритмы проверки контрольных сумм
 * для медицинской, юридической и финансовой документации РФ.
 */

// biome-ignore lint/suspicious/noExplicitAny: generic document state field
export function requiredDocumentField(value: any, label: string): string | null {
	return !value || !String(value).trim() ? label : null;
}

export const REGEX_INN_10 = /^\d{10}$/;
export const REGEX_INN_12 = /^\d{12}$/;
export const REGEX_SNILS = /^\d{3}-?\d{3}-?\d{3}\s?\d{2}$/;
export const REGEX_PASSPORT_RF = /^\d{4}\s?\d{6}$/;
export const REGEX_OMS_16 = /^\d{16}$/;

/**
 * Валидация контрольной суммы ИНН (юридических лиц - 10 знаков, физических лиц - 12 знаков).
 */
export function isValidInn(innRaw: string): boolean {
	const inn = String(innRaw || "").replace(/\D/g, "");
	if (inn.length === 10) {
		const coeffs = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += Number(inn[i]) * (coeffs[i] ?? 0);
		}
		const checkDigit = (sum % 11) % 10;
		return checkDigit === Number(inn[9]);
	}
	if (inn.length === 12) {
		const coeffs11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		let sum11 = 0;
		for (let i = 0; i < 10; i++) {
			sum11 += Number(inn[i]) * (coeffs11[i] ?? 0);
		}
		const checkDigit11 = (sum11 % 11) % 10;
		if (checkDigit11 !== Number(inn[10])) {
			return false;
		}

		const coeffs12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		let sum12 = 0;
		for (let i = 0; i < 11; i++) {
			sum12 += Number(inn[i]) * (coeffs12[i] ?? 0);
		}
		const checkDigit12 = (sum12 % 11) % 10;
		return checkDigit12 === Number(inn[11]);
	}
	return false;
}

/**
 * Валидация контрольной суммы СНИЛС (11 цифр).
 */
export function isValidSnils(snilsRaw: string): boolean {
	const snils = String(snilsRaw || "").replace(/\D/g, "");
	if (snils.length !== 11) {
		return false;
	}
	// Особый диапазон
	const mainPart = snils.slice(0, 9);
	if (Number(mainPart) <= 1001998) {
		return true;
	}
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += Number(snils[i]) * (9 - i);
	}
	let checkDigit = 0;
	if (sum < 100) {
		checkDigit = sum;
	} else if (sum === 100 || sum === 101) {
		checkDigit = 0;
	} else {
		const rem = sum % 101;
		checkDigit = rem === 100 ? 0 : rem;
	}
	const expected = Number(snils.slice(9, 11));
	return checkDigit === expected;
}

/**
 * Валидация серии и номера паспорта гражданина РФ (4 цифры серия + 6 цифр номер).
 */
export function isValidPassportRf(passportRaw: string): boolean {
	const digits = String(passportRaw || "").replace(/\D/g, "");
	return digits.length === 10;
}

/**
 * Валидация единого номера полиса ОМС (16 цифр).
 */
export function isValidOms(omsRaw: string): boolean {
	const digits = String(omsRaw || "").replace(/\D/g, "");
	return digits.length === 16;
}
