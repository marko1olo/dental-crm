/**
 * КАКИЕ ПОЗИЦИИ ПЛАНА ЛЕЧЕНИЯ МОЖНО ОТМЕЧАТЬ В ОТКРЫТОМ ПРИЁМЕ.
 *
 * БЫЛО: список выполненного брал позиции из контекстного
 * `activeTreatmentPlanItems`, а тот отфильтрован по `documentPatient`
 * (useAppLogic.tsx:4949), где `documentPatient = selectedPatient ?? activePatient`,
 * а `selectedPatient` — это пациент, выбранный в разделе «Пациенты»
 * (hooks/domains/usePatientLogic.ts:136-145). Выбор переживает уход из своего
 * раздела, приём его не сбрасывает.
 *
 * Врач вёл приём пациента А, в списке пациентов открытым оставался пациент Б — и
 * внутри карты приёма пациента А перечислялся план лечения ПАЦИЕНТА Б с его
 * ценами. Галочка дописывала «Выполнено: <услуга пациента Б> — 4 500,00 ₽» в
 * поле «План» приёма пациента А, откуда строка уходила в его ЭМК и в кассу.
 *
 * Правило вынесено сюда, чтобы его держал тест, а не внимательность: соблазн
 * вернуться к готовому `activeTreatmentPlanItems` останется у любого, кто будет
 * править этот экран дальше.
 */

/**
 * Позиции плана, которые принадлежат пациенту ОТКРЫТОГО приёма и ещё не
 * отменены. Без идентификатора пациента приёма отмечать нельзя ничего: строка
 * «Выполнено…» уходит в карту конкретного человека, и ошибиться тут нечем
 * оправдать.
 */
export function visitOwnedPlanItems(
	treatmentPlanItems: unknown,
	visitPatientId: string | null,
): any[] {
	if (!visitPatientId) return [];
	if (!Array.isArray(treatmentPlanItems)) return [];
	return treatmentPlanItems.filter(
		(item: any) => item?.patientId === visitPatientId && item?.status !== "cancelled",
	);
}

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
 * Непрочитанным значение бывает не только у пустой цены: numeric из drizzle
 * приходит СТРОКОЙ, данные дашборда на клиенте схемой не проверяются, а
 * «1500,50» с запятой Number() не принимает вовсе.
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
	// В классе ниже стоят три знака: обычный пробел (через \s), неразрывный
	// U+00A0 и узкий неразрывный U+202F. Именно ими разделяют тысячи в русских
	// выгрузках и в тексте, скопированном из другой программы. Невидимые знаки
	// в исходнике оставлены сознательно: \s в JavaScript их и так покрывает, но
	// явный перечень не даст «причесать пробелы» и молча сменить поведение.
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

/**
 * Итог строки плана: цена × количество − скидка, не ниже нуля. Формула ровно та
 * же, что в смете (useAppLogic.tsx) и в ленте оплат (FinanceLedger.tsx).
 *
 * null означает «посчитать нельзя»: цены нет, количество нечитаемо или скидка
 * нечитаема. Ноль вместо null был бы ложью про деньги.
 */
export function planLineTotalRub(item: unknown): number | null {
	const unit = parseRubAmount((item as { unitPriceRub?: unknown } | null)?.unitPriceRub);
	if (unit === null) return null;
	const quantity = planLineQuantity(item);
	if (quantity === null) return null;
	const rawDiscount = (item as { discountRub?: unknown } | null)?.discountRub;
	const discount =
		rawDiscount === null || rawDiscount === undefined || rawDiscount === ""
			? 0
			: parseRubAmount(rawDiscount);
	if (discount === null) return null;
	return Math.max(0, roundToKopecks(unit * quantity - discount));
}
