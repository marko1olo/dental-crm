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

	if (!clean || /^0+$/.test(clean)) {
		return { isValid: false, type: "invalid", cleanInn: "", error: "ИНН не заполнен или состоит из нулей" };
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

export function validateRussianKpp(kpp: string | null | undefined): {
	isValid: boolean;
	cleanKpp: string;
	error?: string;
	errorMessageRu?: string;
} {
	const clean = String(kpp ?? "").replace(/\D/g, "");
	const isValid = clean.length === 9;
	return {
		isValid,
		cleanKpp: clean,
		error: isValid ? undefined : "КПП должен содержать ровно 9 цифр",
		errorMessageRu: isValid ? undefined : "КПП должен содержать ровно 9 цифр",
	};
}

export function validateRussianOgrn(ogrn: string | null | undefined): {
	isValid: boolean;
	cleanOgrn: string;
	error?: string;
	errorMessageRu?: string;
} {
	const clean = String(ogrn ?? "").replace(/\D/g, "");
	if (clean.length === 13) {
		const num12 = BigInt(clean.slice(0, 12));
		const checkDigit = Number(num12 % 11n % 10n);
		const isValid = checkDigit === Number(clean[12]);
		return {
			isValid,
			cleanOgrn: clean,
			error: isValid ? undefined : "Неверная контрольная сумма 13-значного ОГРН организации",
			errorMessageRu: isValid ? undefined : "Неверная контрольная сумма 13-значного ОГРН организации",
		};
	}
	if (clean.length === 15) {
		const num14 = BigInt(clean.slice(0, 14));
		const checkDigit = Number(num14 % 13n % 10n);
		const isValid = checkDigit === Number(clean[14]);
		return {
			isValid,
			cleanOgrn: clean,
			error: isValid ? undefined : "Неверная контрольная сумма 15-значного ОГРНИП",
			errorMessageRu: isValid ? undefined : "Неверная контрольная сумма 15-значного ОГРНИП",
		};
	}
	return {
		isValid: false,
		cleanOgrn: clean,
		error: "ОГРН должен содержать 13 цифр (ЮЛ) или 15 цифр (ОГРНИП)",
		errorMessageRu: "ОГРН должен содержать 13 цифр (ЮЛ) или 15 цифр (ОГРНИП)",
	};
}
