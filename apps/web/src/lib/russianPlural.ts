/**
 * apps/web/src/lib/russianPlural.ts
 *
 * Согласование числа с существительным по-русски: «1 сообщение», «2 сообщения»,
 * «5 сообщений», «1.5 упаковки».
 *
 * Канонический листовой модуль (SSOT, Мандат 8s).
 * Никаких внешних импортов, чистый функционал, мгновенный запуск в node:test и React.
 */

/**
 * Склонение русского существительного по числовому значению (1, 2, 5).
 * Возвращает строго форму слова (без числа):
 * 1 -> "рубль", 2 -> "рубля", 5 -> "рублей", 1.5 -> "рубля"
 */
export function pluralizeRu(
	quantity: number,
	one: string,
	few: string,
	many: string,
): string {
	const abs = Math.abs(quantity);
	// Дробные количества в русском языке всегда требуют родительного падежа единственного числа (1.5 упаковки, 0.5 дозы)
	if (!Number.isInteger(abs)) {
		return few;
	}
	const mod100 = abs % 100;
	const mod10 = abs % 10;
	if (mod100 >= 11 && mod100 <= 19) {
		return many;
	}
	if (mod10 === 1) {
		return one;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return few;
	}
	return many;
}

/** Алиас для совместимости со складским модулем */
export const pluralizeRussian = pluralizeRu;

/**
 * Согласование числа с существительным: «1 сообщение», «2 сообщения», «5 сообщений».
 */
export function countLabel(
	count: number,
	one: string,
	few: string,
	many: string,
): string {
	return `${count} ${pluralizeRu(count, one, few, many)}`;
}

