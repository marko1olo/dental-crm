/**
 * money.ts — Canonical Dental Money & Exact Kopecks Arithmetic Engine.
 *
 * Fully compliant with Mandate 8b (Money and legal documents are exact to the kopeck)
 * and Mandate 8s (Law of the Single Indivisible Authority).
 *
 * Holds:
 * 1. Zod schemas for ruble values with exact kopeck precision (moneyRubSchema, positiveMoneyRubSchema, nonNegativeMoneyRubSchema).
 * 2. Exact integer kopeck arithmetic without IEEE-754 floating-point drift (parseKopecks, rublesToKopecks, sumKopecks, multiplyKopecks, splitKopecks, etc.).
 * 3. Exact formatting helpers (formatKopecksRu, formatKopecksToRubles, formatKopecksToRubExact, moneyRub).
 * 4. Exact global discount allocation (allocateGlobalDiscountCents).
 */

import { z } from "zod";

/**
 * Денежная сумма в рублях с копейками.
 *
 * Раньше суммы объявлялись `z.number().int()`, и клиника не могла принять ни
 * 1500,50, ни 0,50: дробное значение отвергалось на входе схемой, а колонка в
 * базе была integer. Теперь копейки допустимы, но строго две: три знака после
 * запятой — это не деньги, а ошибка ввода или сломанный расчёт, и молча
 * округлять их нельзя.
 *
 * Проверка идёт на копейках целым числом. Сравнение вида `value % 0.01 === 0`
 * на двоичной плавающей точке неверно: 1500.5 % 0.01 не ноль.
 */
const kopecksAreExact = (value: number) =>
	typeof value === "number" &&
	Number.isFinite(value) &&
	!Number.isNaN(value) &&
	Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const moneyRubSchema = z.number().refine(kopecksAreExact, {
	message: "сумма указывается с точностью до копейки",
});

export const positiveMoneyRubSchema = moneyRubSchema.refine(
	(value) => typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value) && value > 0,
	{
		message: "сумма должна быть больше нуля",
	},
);

export const nonNegativeMoneyRubSchema = moneyRubSchema.refine(
	(value) => typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value) && value >= 0,
	{
		message: "сумма не может быть отрицательной",
	},
);

/**
 * Форматирует целые копейки в строку рублей с двумя знаками ("150.00").
 */
export function formatKopecksToRubles(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return "0.00";
	return (Math.round(kopecks) / 100).toFixed(2);
}

export const formatKopecksToRubExact = formatKopecksToRubles;

/** Копейки. Ровно целое число; отрицательное значение — долг. */
export type Kopecks = number;

const KOPECKS_IN_RUBLE = 100;

/**
 * Неразрывный пробел (U+00A0) для разрядов и знака рубля: иначе строка может
 * разорваться посередине суммы или оставить "₽" на следующей строке.
 *
 * Записано escape-последовательностью намеренно. Невидимый U+00A0 в исходнике
 * не отличить от обычного пробела глазами — на этом уже спотыкались тесты.
 */
export const RU_MONEY_NBSP = " ";

/** Типографский минус (U+2212), а не дефис: у дефиса другая ширина. */
export const RU_MONEY_MINUS = "−";

/**
 * Разбирает денежное значение из базы в копейки без плавающей точки.
 *
 * Принимает то, что реально приходит из драйвера: строку от `numeric`, число от
 * `integer`, либо null. Строка разбирается регулярным выражением — parseFloat
 * уже на этом шаге внёс бы погрешность.
 *
 * Дробная часть длиннее двух знаков — ошибка, а не повод округлить молча:
 * в базе таких значений быть не должно (numeric(12, 2)), и если они появились,
 * это повреждение данных, о котором нужно узнать.
 */
export function parseKopecks(
	value: string | number | null | undefined,
): Kopecks {
	if (value === null || value === undefined || value === "") return 0;

	if (typeof value === "number") {
		if (!Number.isFinite(value) || Number.isNaN(value)) {
			throw new Error(`Денежное значение не является числом: ${value}`);
		}
		// Колонки integer хранят целые рубли — тут перевод точный.
		if (Number.isInteger(value)) return value * KOPECKS_IN_RUBLE;
		// Нецелое число уже прошло через плавающую точку. Приводим через строку
		// с двумя знаками: это ровно то, что записалось бы в numeric(12, 2).
		return parseKopecks(value.toFixed(2));
	}

	const text = value.trim();
	const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!match) {
		throw new Error(`Не похоже на денежное значение: "${value}"`);
	}
	const [, sign, whole, fraction = ""] = match;
	const kopecks =
		Number(whole) * KOPECKS_IN_RUBLE + Number(fraction.padEnd(2, "0"));
	return sign ? -kopecks : kopecks;
}

/** Рубли → копейки с защитой от нецелых чисел и плавающей точки (округление до копейки). */
export function rublesToKopecks(rubles: number): Kopecks {
	if (typeof rubles !== "number" || !Number.isFinite(rubles) || Number.isNaN(rubles)) {
		throw new Error(`Ожидалось число рублей, получено ${rubles}`);
	}
	return Math.round(rubles * KOPECKS_IN_RUBLE);
}

/**
 * Копейки → строка для записи в колонку numeric(12, 2).
 *
 * Именно строка: передать сюда number значило бы снова пустить деньги через
 * double по пути в драйвер.
 */
export function kopecksToNumericString(kopecks: Kopecks): string {
	assertWholeKopecks(kopecks);
	const negative = kopecks < 0;
	const absolute = Math.abs(kopecks);
	const whole = Math.trunc(absolute / KOPECKS_IN_RUBLE);
	const fraction = absolute % KOPECKS_IN_RUBLE;
	return `${negative ? "-" : ""}${whole}.${String(fraction).padStart(2, "0")}`;
}

/** Целые рубли из копеек. Бросает, если копейки не делятся на 100 без остатка. */
export function kopecksToWholeRubles(kopecks: Kopecks): number {
	assertWholeKopecks(kopecks);
	if (kopecks % KOPECKS_IN_RUBLE !== 0) {
		throw new Error(
			`Сумма ${kopecksToNumericString(kopecks)} руб. содержит копейки и не может быть выражена целыми рублями`,
		);
	}
	return kopecks / KOPECKS_IN_RUBLE;
}

/** Сумма нескольких значений. Точная: складываются целые. */
export function sumKopecks(values: readonly Kopecks[]): Kopecks {
	let total = 0;
	for (const value of values) {
		assertWholeKopecks(value);
		total += value;
	}
	return total;
}

/** Цена за единицу × количество. Количество обязано быть целым. */
export function multiplyKopecks(unit: Kopecks, quantity: number): Kopecks {
	assertWholeKopecks(unit);
	if (!Number.isInteger(quantity) || quantity < 0) {
		throw new Error(
			`Количество должно быть целым неотрицательным, получено ${quantity}`,
		);
	}
	return unit * quantity;
}

/** Цена за единицу × дробное количество (граммы, миллилитры). Округляет до целых копеек. */
export function multiplyKopecksFractional(
	unit: Kopecks,
	quantity: number,
): Kopecks {
	assertWholeKopecks(unit);
	if (!Number.isFinite(quantity) || quantity < 0) {
		throw new Error(
			`Количество должно быть конечным неотрицательным числом, получено ${quantity}`,
		);
	}
	return Math.round(unit * quantity) as Kopecks;
}

/**
 * Доля от суммы по проценту — для страхового покрытия и скидок.
 *
 * Процент задаётся в базисных пунктах (1% = 100 б.п.), чтобы не тащить в расчёт
 * дробное число. Остаток отбрасывается: доля покрытия не должна оказаться
 * больше самой суммы из-за округления вверх.
 */
export function percentageOfKopecks(
	amount: Kopecks,
	basisPoints: number,
): Kopecks {
	assertWholeKopecks(amount);
	if (!Number.isInteger(basisPoints) || basisPoints < 0) {
		throw new Error(
			`Процент должен быть целым в базисных пунктах, получено ${basisPoints}`,
		);
	}
	return Math.trunc((amount * basisPoints) / 10_000);
}

/**
 * Делит сумму на `parts` частей так, что их сумма РАВНА исходной.
 *
 * Нужно для рассрочки: 100.00 на 3 платежа — это 33.34 + 33.33 + 33.33, а не
 * три раза по 33.33 с потерянной копейкой и не три раза по 33.34 с лишней.
 * Остаток раскидывается по первым частям — так первый платёж чуть больше, что
 * привычно для графиков платежей.
 *
 * Тип возврата — непустой кортеж, а не просто массив. Это не украшение: `parts`
 * меньше единицы отсекается броском ниже, поэтому первая часть существует
 * ВСЕГДА, и вызывающий не обязан её проверять. С обычным `Kopecks[]` при
 * включённом noUncheckedIndexedAccess разбор `const [first] = splitKopecks(...)`
 * давал `Kopecks | undefined`, и график рассрочки в renderDocument.ts не
 * компилировался. Вторая часть по-прежнему может отсутствовать — при `parts: 1`
 * её действительно нет, и это правда, которую тип обязан сохранить.
 */
export function splitKopecks(
	total: Kopecks,
	parts: number,
): [Kopecks, ...Kopecks[]] {
	assertWholeKopecks(total);
	if (!Number.isInteger(parts) || parts <= 0) {
		throw new Error(
			`Число частей должно быть целым положительным, получено ${parts}`,
		);
	}
	const sign = total < 0 ? -1 : 1;
	const absolute = Math.abs(total);
	const base = Math.trunc(absolute / parts);
	const remainder = absolute - base * parts;
	const split = Array.from(
		{ length: parts },
		(_, index) => sign * (base + (index < remainder ? 1 : 0)),
	);
	return split as [Kopecks, ...Kopecks[]];
}

/** Отображение для интерфейса и печатных форм: "1 500,50 ₽". */
export function formatKopecksRu(kopecks: Kopecks): string {
	assertWholeKopecks(kopecks);
	const negative = kopecks < 0;
	const absolute = Math.abs(kopecks);
	const whole = Math.trunc(absolute / KOPECKS_IN_RUBLE);
	const fraction = absolute % KOPECKS_IN_RUBLE;
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_MONEY_NBSP);
	const sign = negative ? RU_MONEY_MINUS : "";
	return `${sign}${grouped},${String(fraction).padStart(2, "0")}${RU_MONEY_NBSP}₽`;
}

/** Алиас для обратной совместимости */
export const moneyRub = formatKopecksRu;

function assertWholeKopecks(value: Kopecks): void {
	if (typeof value !== "number" || !Number.isFinite(value) || Number.isNaN(value) || !Number.isInteger(value)) {
		throw new Error(
			`Копейки должны быть целым числом, получено ${value}. Похоже, сумма прошла через плавающую точку.`,
		);
	}
	if (!Number.isSafeInteger(value)) {
		throw new Error(`Сумма ${value} копеек выходит за пределы точного целого`);
	}
}

/**
 * Распределяет глобальную скидку (в копейках / центах) между позициями счёта
 * строго пропорционально их стоимости, без потери ни одной копейки.
 *
 * Остаток от округления целочисленного деления (remainder) падает на
 * последнюю позицию с наибольшей суммой, исключая расхождения в 1 копейку (Мандат 8b).
 *
 * @param items Массив позиций с id и стоимостью в копейках (bigint)
 * @param totalDiscountCents Сумма скидки в копейках (bigint)
 * @returns Map<string, bigint> соответствие id позиции и приходящейся на неё скидки
 */
export function allocateGlobalDiscountCents(
	items: Array<{ id: string; amountCents: bigint }>,
	totalDiscountCents: bigint,
): Map<string, bigint> {
	const result = new Map<string, bigint>();
	if (items.length === 0) {
		return result;
	}

	for (const item of items) {
		result.set(item.id, 0n);
	}

	if (totalDiscountCents <= 0n) {
		return result;
	}

	let totalAmountCents = 0n;
	for (const item of items) {
		if (item.amountCents > 0n) {
			totalAmountCents += item.amountCents;
		}
	}

	if (totalAmountCents <= 0n) {
		return result;
	}

	// Скидка не может превышать общую стоимость позиций
	const effectiveDiscount =
		totalDiscountCents > totalAmountCents
			? totalAmountCents
			: totalDiscountCents;

	let allocatedTotal = 0n;
	for (const item of items) {
		if (item.amountCents <= 0n) {
			result.set(item.id, 0n);
			continue;
		}
		const share = (effectiveDiscount * item.amountCents) / totalAmountCents;
		result.set(item.id, share);
		allocatedTotal += share;
	}

	const remainder = effectiveDiscount - allocatedTotal;
	if (remainder > 0n) {
		// Ищем последнюю позицию с максимальной суммой
		let maxAmount = -1n;
		let targetItem: { id: string; amountCents: bigint } | null = null;

		for (const item of items) {
			if (item.amountCents >= maxAmount) {
				maxAmount = item.amountCents;
				targetItem = item;
			}
		}

		if (targetItem) {
			const currentShare = result.get(targetItem.id) ?? 0n;
			result.set(targetItem.id, currentShare + remainder);
		}
	}

	return result;
}

