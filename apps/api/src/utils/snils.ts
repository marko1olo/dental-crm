/**
 * Проверка СНИЛС по контрольному числу.
 *
 * ЗАЧЕМ: в routes/egisz.ts «валидация» сводилась к `digits.length !== 11`.
 * Такая проверка пропускает любую опечатку, а ФРМР сверяет контрольное число и
 * отклоняет случай обслуживания уже на стороне Минздрава — ошибка всплывала
 * через сутки и без внятной причины.
 *
 * Алгоритм (Постановление Правления ПФР от 31.07.2006 № 192п):
 *   номер = 9 цифр, контрольное число = 2 последние цифры;
 *   сумма = Σ цифра[i] × (9 − i), i = 0..8;
 *   сумма  < 100          → контрольное = сумма;
 *   сумма == 100 или 101  → контрольное = 0;
 *   сумма  > 101          → остаток = сумма % 101,
 *                           остаток == 100 или 101 → 0, иначе остаток.
 *
 * Номера до 001-001-998 выданы до введения контрольного числа и не проверяются.
 */

export function normalizeSnils(input: unknown): string {
	if (typeof input === "number") return String(input).replace(/\D/g, "");
	if (typeof input !== "string") return "";
	return input.replace(/\D/g, "");
}

export function isValidSnils(input: unknown): boolean {
	const digits = normalizeSnils(input);
	if (digits.length !== 11) return false;

	// Все одинаковые цифры («00000000000») формально проходят контрольную
	// сумму, но валидным СНИЛС не являются.
	if (/^(\d)\1{10}$/.test(digits)) return false;

	const numberPart = digits.slice(0, 9);
	const providedChecksum = Number.parseInt(digits.slice(9, 11), 10);

	// Номера меньше 001001998 выданы до введения контрольного числа.
	if (Number.parseInt(numberPart, 10) <= 1001998) return true;

	let sum = 0;
	for (let index = 0; index < 9; index += 1) {
		sum += Number.parseInt(numberPart.charAt(index), 10) * (9 - index);
	}

	let expected: number;
	if (sum < 100) expected = sum;
	else if (sum === 100 || sum === 101) expected = 0;
	else {
		const remainder = sum % 101;
		expected = remainder === 100 || remainder === 101 ? 0 : remainder;
	}

	return expected === providedChecksum;
}

/** «12345678901» → «123-456-789 01». Пустая строка, если номер невалиден. */
export function formatSnils(input: unknown): string {
	const digits = normalizeSnils(input);
	if (digits.length !== 11) return "";
	return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
}
