import type { NormalizedValue } from "./types.js";

export function ok<T>(
	value: T,
	transforms: string[],
	confidence = 1,
): NormalizedValue<T> {
	return { value, transforms, confidence, issue: null };
}

export function empty<T>(transforms: string[] = []): NormalizedValue<T> {
	return { value: null, transforms, confidence: 1, issue: null };
}

export function bad<T>(issue: string, transforms: string[] = []): NormalizedValue<T> {
	return { value: null, transforms, confidence: 0, issue };
}

/**
 * Значения, которыми чужие системы обозначают пустоту. Записать «нет данных»
 * в телефон пациента хуже, чем оставить поле пустым: по такому «номеру» потом
 * пытаются звонить, а фильтр «есть телефон» показывает ложную полноту базы.
 */
const NULL_TOKENS = new Set([
	"",
	"-",
	"--",
	"---",
	"—",
	"–",
	"н/д",
	"нд",
	"н.д.",
	"нет",
	"нет данных",
	"не указан",
	"не указано",
	"не указана",
	"неизвестно",
	"не помнит",
	"отсутствует",
	"null",
	"nil",
	"none",
	"n/a",
	"na",
	"?",
	"??",
	"0",
	"00.00.0000",
	"00/00/0000",
	"0000-00-00",
	"01.01.1900",
	"1900-01-01",
	"1899-12-30",
	"30.12.1899",
	"empty",
	"пусто",
	/**
	 * Заглушки, которые администраторы вбивают в обязательные поля,
	 * чтобы пропустить их (например, когда телефон неизвестен).
	 */
	"x",
	"xxx",
	/**
	 * Значения ошибок Excel. Попадают в выгрузку, когда в исходной книге стояла
	 * формула со ссылкой на удалённый лист. Для переноса это отсутствие данных,
	 * а не текст: «#ССЫЛКА!» в поле «Телефон» — не номер.
	 */
	"#н/д",
	"#знач!",
	"#дел/0!",
	"#ссылка!",
	"#имя?",
	"#пусто!",
	"#число!",
	"#n/a",
	"#value!",
	"#div/0!",
	"#ref!",
	"#name?",
	"#null!",
	"#num!",
	"#нд",
	"#error",
	"#ошибка",
]);

/**
 * Признак пустого значения. "0" в списке намеренно: в DBF-выгрузках нулём
 * забивают незаполненные числовые ссылки и даты. Для денежных полей это
 * правило отключается отдельным флагом — там ноль осмыслен.
 */
export function isNullToken(
	value: string | null | undefined,
	treatZeroAsNull = true,
): boolean {
	if (value === null || value === undefined) return true;
	const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
	if (normalized === "") return true;
	if (!treatZeroAsNull && /^0+([.,]0+)?$/.test(normalized)) return false;
	return NULL_TOKENS.has(normalized);
}

/**
 * Обрезает значение для сообщения оператору.
 *
 * Сообщения об ошибках попадают в карантин и в отчёты, а туда не должны
 * утекать длинные куски персональных данных: цель — показать, ЧТО не так,
 * а не воспроизвести содержимое карточки.
 */
export function truncateForMessage(value: string, maxLength = 60): string {
	const collapsed = value.replace(/\s+/g, " ").trim();
	return collapsed.length <= maxLength
		? collapsed
		: `${collapsed.slice(0, maxLength)}…`;
}
