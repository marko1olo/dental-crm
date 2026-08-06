import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import {
	changeToReturn,
	fromKopecks,
	remainingDebtAfterPayment,
	rubAmountForInput,
	sumRubAmounts,
	toKopecks,
	unreadablePaymentsWarning,
} from "./cashDeskAmounts";

/**
 * КАССА СЧИТАЕТСЯ ДЕНЬГАМИ, А НЕ ПРИБЛИЗИТЕЛЬНО.
 *
 * Проверяем ровно те четыре способа испортить деньги в кассе, которые в этом
 * коде возможны:
 *  1. округление долга до рубля — недобор или перебор копеек с пациента;
 *  2. `numeric(12,2)` из базы строкой: «10» < «3» и «10» + «3» = «103»;
 *  3. хвост плавающей точки при сложении и вычитании;
 *  4. отказ расчёта, показанный как ноль.
 *
 * Отдельно закреплено главное: текст, который модуль ставит в поле суммы,
 * разбирается ТЕМ ЖЕ разборщиком, что стоит на живом поле. Иначе кассир видит
 * в подсказке одну сумму, а форма получает другую или не получает ничего.
 */

describe("toKopecks", () => {
	it("переводит рубли в целые копейки без хвоста плавающей точки", () => {
		assert.equal(toKopecks(1500.24), 150024);
		assert.equal(toKopecks(0.1), 10);
		// Усечение вместо округления съело бы копейку: 0.29 * 100 в двоичной
		// дроби равно 28.999999999999996, а 2699.7 * 100 — 269970.00000000006.
		assert.equal(toKopecks(0.29), 29);
		assert.equal(toKopecks(2699.7), 269970);
	});

	it("сумму мельче копейки не выдумывает", () => {
		// 1.005 хранится как 1.00499999999999989 — третьего знака у денег нет,
		// и «правильного» ответа здесь не существует. Закрепляем то, что есть,
		// чтобы никто не принял это за потерянную копейку.
		assert.equal(toKopecks(1.005), 100);
	});

	it("принимает numeric(12,2) из базы строкой", () => {
		assert.equal(toKopecks("1500.24"), 150024);
		assert.equal(toKopecks("0.70"), 70);
		assert.equal(toKopecks("10"), 1000);
	});

	it("принимает запятую из поля ввода и разделители разрядов", () => {
		assert.equal(toKopecks("1500,24"), 150024);
		assert.equal(toKopecks("120 000"), 12000000);
		// Неразрывный пробел: именно его ставит toLocaleString('ru-RU').
		assert.equal(toKopecks("120 000,50"), 12000050);
	});

	it("держит возврат и коррекцию с минусом", () => {
		assert.equal(toKopecks(-500.5), -50050);
		assert.equal(toKopecks("-500.50"), -50050);
	});

	it("отказывается от того, что деньгами не является", () => {
		assert.equal(toKopecks(null), null);
		assert.equal(toKopecks(undefined), null);
		assert.equal(toKopecks(""), null);
		assert.equal(toKopecks("   "), null);
		assert.equal(toKopecks("около тысячи"), null);
		assert.equal(toKopecks("1 500 ₽"), null);
		assert.equal(toKopecks(Number.NaN), null);
		assert.equal(toKopecks(Number.POSITIVE_INFINITY), null);
	});
});

describe("rubAmountForInput", () => {
	/*
	 * БЫЛО: Math.round(remainingDebt). Долг 1500,24 ₽ подставлялся как 1500 и
	 * 24 копейки нельзя было закрыть кнопкой вообще; долг 1500,70 ₽ становился
	 * 1501 — перебор с пациента. Обе суммы должны доезжать до поля целиком.
	 */
	it("не теряет копейки долга ни в одну сторону", () => {
		assert.equal(rubAmountForInput(1500.24), "1500,24");
		assert.equal(rubAmountForInput(1500.7), "1500,70");
		assert.equal(rubAmountForInput("2699.7000000000007"), "2699,70");
	});

	it("круглую сумму пишет без лишней запятой", () => {
		assert.equal(rubAmountForInput(1500), "1500");
		assert.equal(rubAmountForInput("1500.00"), "1500");
	});

	it("не ставит разделитель разрядов: поле разбирает текст, а не читает его", () => {
		assert.equal(rubAmountForInput(120000.5), "120000,50");
	});

	it("на нечитаемое и на нулевой долг не заполняет поле ничем", () => {
		assert.equal(rubAmountForInput(null), "");
		assert.equal(rubAmountForInput(undefined), "");
		assert.equal(rubAmountForInput(0), "");
		assert.equal(rubAmountForInput(-100), "");
		assert.equal(rubAmountForInput("мусор"), "");
	});

	/*
	 * Главная проверка модуля: то, что мы кладём в поле, живое поле обязано
	 * понять и понять именно как ту же сумму. Разборщик здесь тот самый, что
	 * стоит на экране оплат.
	 */
	it("отдаёт текст, который живой разборщик поля читает как ту же сумму", () => {
		for (const debtRub of [1500.24, 1500.7, 1500, 0.05, 120000.5, 99999.99]) {
			const text = rubAmountForInput(debtRub);
			assert.equal(
				normalizeRubAmountInput(text),
				debtRub,
				`поле не прочитало «${text}» как ${debtRub}`,
			);
		}
	});
});

describe("remainingDebtAfterPayment", () => {
	it("вычитает копейки целыми", () => {
		assert.equal(remainingDebtAfterPayment(1500.24, 500.24), 1000);
		assert.equal(remainingDebtAfterPayment(0.3, 0.1), 0.2);
	});

	/*
	 * БЫЛО (общая беда денег строкой): для строк «10» < «3» истинно, а вычитание
	 * приводит типы неочевидно. Долг «10» минус платёж «3» должен дать 7.
	 */
	it("считает, а не сравнивает строки из базы", () => {
		assert.equal(remainingDebtAfterPayment("10", "3"), 7);
		assert.equal(remainingDebtAfterPayment("1500.24", "1500.24"), 0);
	});

	it("переплату не показывает отрицательным долгом", () => {
		assert.equal(remainingDebtAfterPayment(1000, 1500), 0);
	});

	it("пустое поле суммы — это полный долг, а не отказ расчёта", () => {
		assert.equal(remainingDebtAfterPayment(1500.24, ""), 1500.24);
		assert.equal(remainingDebtAfterPayment(1500.24, null), 1500.24);
	});

	it("нечитаемый долг отдаёт отказом, а не нулём", () => {
		// Ноль на экране читается как «долгов нет» — это была бы ложь экрана.
		assert.equal(remainingDebtAfterPayment(null, 100), null);
		assert.equal(remainingDebtAfterPayment("нет данных", 100), null);
	});
});

describe("changeToReturn", () => {
	it("считает сдачу в копейках", () => {
		assert.equal(changeToReturn(2000, 1500.24), 499.76);
		assert.equal(changeToReturn("2000.00", "1500.24"), 499.76);
	});

	it("при недоплате сдачи нет", () => {
		assert.equal(changeToReturn(1000, 1500), 0);
	});

	it("нечитаемые данные — отказ расчёта", () => {
		assert.equal(changeToReturn("", 1500), null);
		assert.equal(changeToReturn(2000, null), null);
	});
});

describe("sumRubAmounts", () => {
	it("складывает деньгами, а не строками", () => {
		// Строкой это дало бы «103».
		assert.deepEqual(sumRubAmounts(["10", "3"]), {
			totalRub: 13,
			unreadableCount: 0,
		});
	});

	it("не набирает хвост плавающей точки", () => {
		assert.deepEqual(sumRubAmounts([0.1, 0.2]), {
			totalRub: 0.3,
			unreadableCount: 0,
		});
		assert.deepEqual(sumRubAmounts(["1500.24", 1500.24, "0.02"]), {
			totalRub: 3000.5,
			unreadableCount: 0,
		});
	});

	it("нечитаемые строки считает отдельно, а не молча выбрасывает", () => {
		assert.deepEqual(sumRubAmounts(["1000", null, "мусор", 500]), {
			totalRub: 1500,
			unreadableCount: 2,
		});
	});
});

describe("unreadablePaymentsWarning", () => {
	/*
	 * Счётное слово согласуется общей countLabel. Склеенная руками строка дала бы
	 * «2 платёж не разобран» — надпись, которая читается как ошибка программы, и
	 * доверие к самому итогу, к деньгам, падает вместе с ней.
	 */
	it("согласует число с существительным и глаголом", () => {
		assert.match(unreadablePaymentsWarning(1), /^1 платёж не попал в итог/);
		assert.match(unreadablePaymentsWarning(2), /^2 платежа не попали в итог/);
		assert.match(unreadablePaymentsWarning(5), /^5 платежей не попали в итог/);
		// 11–14 всегда множественное, поблажка для «один» тут не действует.
		assert.match(
			unreadablePaymentsWarning(11),
			/^11 платежей не попали в итог/,
		);
		assert.match(unreadablePaymentsWarning(21), /^21 платёж не попал в итог/);
	});

	it("подсказывает, что делать, а не только что всё плохо", () => {
		assert.ok(unreadablePaymentsWarning(3).includes("журнале оплат"));
	});

	it("молчит, когда разобрано всё", () => {
		assert.equal(unreadablePaymentsWarning(0), "");
		assert.equal(unreadablePaymentsWarning(-1), "");
		assert.equal(unreadablePaymentsWarning(Number.NaN), "");
	});

	it("в тексте нет латиницы", () => {
		assert.ok(!/[A-Za-z]/.test(unreadablePaymentsWarning(4)));
	});
});

describe("fromKopecks", () => {
	it("возвращает рубли, пригодные для money()", () => {
		assert.equal(fromKopecks(150024), 1500.24);
		assert.equal(fromKopecks(5), 0.05);
		assert.equal(fromKopecks(0), 0);
	});
});
