/**
 * completedServicesPricing.ts — Ценовая математика и финансовый парсинг завершенных услуг
 * (Wave 47 / Clinical Visit Financial Math).
 *
 * Точный расчет стоимости строк плана, защита от потерь копеек и безопасный
 * парсинг рублей из разнородных локалей без галлюцинаций нулевых цен.
 */

/** Копейки не теряем и не выдумываем: 1500,505 ₽ не бывает. */
export function roundToKopecks(value: number): number {
	return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/**
 * РУБЛИ ИЗ ОТВЕТА СЕРВЕРА. Возвращает null, когда числа там нет.
 *
 * БЫЛО: `Number(item?.unitPriceRub ?? 0)`. Любое непрочитанное значение
 * превращалось в НОЛЬ и печаталось как «0 ₽» — то есть услуга с неизвестной ценой
 * выглядела бесплатной, и её ноль ещё и складывался в итог «К оплате по
 * отмеченному». Врач называл пациенту сумму, в которой не хватало позиций.
 *
 * Запятую принимаем: в русской локали её вводят руками и она приходит из
 * переносов из других программ. Разделитель тысяч (пробел, узкий пробел,
 * неразрывный пробел) убираем. А вот строку, где есть И запятая, И точка,
 * разбирать не берёмся: «1,500.50» и «1.500,50» — это разные числа, и угадывать
 * в деньгах нельзя. Такая строка честно возвращает null.
 */
export function parseRubAmount(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	// Обычный пробел (\s), неразрывный U+00A0 и узкий неразрывный U+202F.
	const cleaned = value.replace(/[\s  ]/g, "");
	if (!cleaned) return null;
	if (cleaned.includes(",") && cleaned.includes(".")) return null;
	const normalized = cleaned.replace(",", ".");
	if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Количество в позиции плана. Отсутствие количества — это одна единица (так
 * считает и смета), а вот ноль, отрицательное и нечитаемое значение — это не
 * количество, и цену по нему считать нельзя.
 */
export function planLineQuantity(item: unknown): number | null {
	const raw = (item as { quantity?: unknown } | null)?.quantity;
	if (raw === null || raw === undefined || raw === "") return 1;
	const parsed = parseRubAmount(raw);
	if (parsed === null || parsed <= 0) return null;
	return parsed;
}

export function planLineDiscountRub(item: unknown): number | null {
	const rawDiscount = (item as { discountRub?: unknown } | null)?.discountRub;
	if (rawDiscount === null || rawDiscount === undefined || rawDiscount === "") {
		return 0;
	}
	const parsed = parseRubAmount(rawDiscount);
	if (parsed === null || parsed < 0) return null;
	return parsed;
}

/**
 * Итог строки плана: цена × количество − скидка, не ниже нуля. Формула ровно та
 * же, что в смете (useAppLogic.tsx) и в ленте оплат (FinanceLedger.tsx).
 *
 * null означает «посчитать нельзя»: цены нет, количество нечитаемо или скидка
 * нечитаема. Ноль вместо null был бы ложью про деньги.
 */
export function planLineTotalRub(item: unknown): number | null {
	const unit = parseRubAmount(
		(item as { unitPriceRub?: unknown } | null)?.unitPriceRub,
	);
	if (unit === null) return null;
	const quantity = planLineQuantity(item);
	if (quantity === null) return null;
	const discount = planLineDiscountRub(item);
	if (discount === null) return null;
	return Math.max(0, roundToKopecks(unit * quantity - discount));
}

/** Цена не указана — так и пишем. Ноль вместо неё был бы ложью про деньги. */
export const PRICE_UNKNOWN_TEXT = "цена не указана";
