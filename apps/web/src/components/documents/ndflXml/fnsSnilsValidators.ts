import { formatSnils, isValidSnils } from "@dental/shared";

/**
 * Проверка контрольной суммы СНИЛС РФ.
 * Формат: 11 цифр (XXX-XXX-XXX YY).
 */
export function validateRussianSnils(snils: string | null | undefined): {
	isValid: boolean;
	cleanSnils: string;
	formatted: string;
	error?: string;
} {
	const clean = String(snils ?? "").replace(/\D/g, "");

	if (!clean) {
		return {
			isValid: false,
			cleanSnils: "",
			formatted: "",
			error: "СНИЛС не указан",
		};
	}

	if (clean.length !== 11) {
		return {
			isValid: false,
			cleanSnils: clean,
			formatted: clean,
			error: `СНИЛС должен содержать ровно 11 цифр, сейчас ${clean.length}`,
		};
	}

	if (/^0{11}$/.test(clean) || /^(\d)\1{10}$/.test(clean)) {
		return {
			isValid: false,
			cleanSnils: clean,
			formatted: clean,
			error: "СНИЛС не может состоять из одних нулей",
		};
	}

	const formatted = formatSnils(clean);

	if (!isValidSnils(clean)) {
		return {
			isValid: false,
			cleanSnils: clean,
			formatted,
			error: `Неверное контрольное число СНИЛС (указано: ${clean.slice(9, 11)})`,
		};
	}

	return { isValid: true, cleanSnils: clean, formatted };
}
