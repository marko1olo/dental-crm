/**
 * Russian Tax Identification Number (ИНН), КПП and ОГРН Validators.
 */

export function validateRussianInn(inn: string | null | undefined): {
	isValid: boolean;
	type: "individual" | "legal" | "invalid";
	cleanInn: string;
	error?: string;
} {
	const clean = String(inn ?? "").replace(/\D/g, "");

	if (!clean) {
		return { isValid: false, type: "invalid", cleanInn: "", error: "ИНН не заполнен" };
	}

	if (clean.length === 10) {
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const digits = clean.split("").map(Number);
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += (digits[i] ?? 0) * (weights[i] ?? 0);
		}
		const checkDigit = (sum % 11) % 10;
		if (checkDigit === digits[9]) {
			return { isValid: true, type: "legal", cleanInn: clean };
		}
		return {
			isValid: false,
			type: "invalid",
			cleanInn: clean,
			error: `Неверная контрольная сумма ИНН ЮЛ (ожидалась ${checkDigit}, получена ${digits[9]})`,
		};
	}

	if (clean.length === 12) {
		const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
		const digits = clean.split("").map(Number);

		let sum11 = 0;
		for (let i = 0; i < 10; i++) {
			sum11 += (digits[i] ?? 0) * (weights11[i] ?? 0);
		}
		const checkDigit11 = (sum11 % 11) % 10;

		let sum12 = 0;
		for (let i = 0; i < 11; i++) {
			sum12 += (digits[i] ?? 0) * (weights12[i] ?? 0);
		}
		const checkDigit12 = (sum12 % 11) % 10;

		if (checkDigit11 === digits[10] && checkDigit12 === digits[11]) {
			return { isValid: true, type: "individual", cleanInn: clean };
		}
		return {
			isValid: false,
			type: "invalid",
			cleanInn: clean,
			error: `Неверная контрольная сумма ИНН ФЛ (контрольные цифры: ${checkDigit11}${checkDigit12}, указаны: ${digits[10]}${digits[11]})`,
		};
	}

	return {
		isValid: false,
		type: "invalid",
		cleanInn: clean,
		error: `ИНН должен содержать ровно 10 цифр (ЮЛ) или 12 цифр (ФЛ/ИП), сейчас ${clean.length} цифр`,
	};
}

export function validateRussianKpp(kpp: string | null | undefined): boolean {
	const clean = String(kpp ?? "").replace(/\D/g, "");
	return clean.length === 9;
}

export function validateRussianOgrn(ogrn: string | null | undefined): boolean {
	const clean = String(ogrn ?? "").replace(/\D/g, "");
	return clean.length === 13 || clean.length === 15;
}
