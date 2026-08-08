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
	Number.isFinite(value) &&
	Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const moneyRubSchema = z.number().refine(kopecksAreExact, {
	message: "сумма указывается с точностью до копейки",
});

export const positiveMoneyRubSchema = moneyRubSchema.refine(
	(value) => value > 0,
	{
		message: "сумма должна быть больше нуля",
	},
);

export const nonNegativeMoneyRubSchema = moneyRubSchema.refine(
	(value) => value >= 0,
	{
		message: "сумма не может быть отрицательной",
	},
);
