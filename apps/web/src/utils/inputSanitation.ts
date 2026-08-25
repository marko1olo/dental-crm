export function formatPhoneNumber(value: string): string {
	if (!value) return value;

	// Remove all non-digits
	const digits = value.replace(/\D/g, "");
	if (digits.length === 0) return "";

	// Special handling if starts with 7 or 8 for Russian numbers
	let prefix = "";
	let rest = digits;

	if (digits.startsWith("7") || digits.startsWith("8")) {
		prefix = "+7 ";
		rest = digits.substring(1);
	} else if (digits.length >= 10) {
		prefix = "+7 ";
	} else {
		// Just a fallback for non-russian or incomplete starts
		prefix = "+";
	}

	if (rest.length === 0) return prefix;

	let formatted = `${prefix}(${rest.substring(0, 3)}`;

	if (rest.length >= 4) {
		formatted += `) ${rest.substring(3, 6)}`;
	}
	if (rest.length >= 7) {
		formatted += `-${rest.substring(6, 8)}`;
	}
	if (rest.length >= 9) {
		formatted += `-${rest.substring(8, 10)}`;
	}

	return formatted;
}

export function formatCurrencyNumeric(value: string | number): string {
	if (typeof value === "number") {
		return Math.max(0, Math.round(value)).toString();
	}

	// Remove non-digits
	const digits = value.replace(/[^\d]/g, "");
	if (!digits) return "";

	const num = parseInt(digits, 10);
	return Number.isNaN(num) ? "" : num.toString();
}

/**
 * Автоформатирование СНИЛС (11 цифр в формате XXX-XXX-XXX XX)
 */
export function formatSnils(value: string): string {
	if (!value) return "";
	const digits = value.replace(/\D/g, "").slice(0, 11);
	if (!digits) return "";

	let formatted = digits.slice(0, 3);
	if (digits.length > 3) {
		formatted += `-${digits.slice(3, 6)}`;
	}
	if (digits.length > 6) {
		formatted += `-${digits.slice(6, 9)}`;
	}
	if (digits.length > 9) {
		formatted += ` ${digits.slice(9, 11)}`;
	}
	return formatted;
}

/**
 * Автоформатирование паспорта РФ (серия и номер: 4 цифры серии + пробел + 6 цифр номера)
 * Если пользователь вводит произвольный документ (например, свидетельство о рождении), текст сохраняется.
 */
export function formatRussianPassport(value: string): string {
	if (!value) return "";
	const trimmed = value.trim();
	const digits = value.replace(/\D/g, "");
	if (digits.length > 0 && /^\d+[\s\d]*$/.test(trimmed)) {
		const clampedDigits = digits.slice(0, 10);
		if (clampedDigits.length <= 4) {
			return clampedDigits;
		}
		return `${clampedDigits.slice(0, 4)} ${clampedDigits.slice(4, 10)}`;
	}
	return value;
}

/**
 * Автоформатирование ИНН (до 12 цифр)
 */
export function formatTaxpayerInn(value: string): string {
	if (!value) return "";
	return value.replace(/\D/g, "").slice(0, 12);
}

/**
 * Автоформатирование полиса ОМС / ЕНП (16 цифр: XXXX XXXX XXXX XXXX)
 */
export function formatOmsPolicy(value: string): string {
	if (!value) return "";
	const digits = value.replace(/\D/g, "").slice(0, 16);
	if (!digits) return "";
	if (digits.length <= 4) return digits;
	if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
	if (digits.length <= 12) return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
	return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)}`;
}
