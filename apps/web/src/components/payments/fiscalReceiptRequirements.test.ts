import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fiscalFieldLabels,
	fiscalReceiptUrlErrorText,
	isFiscalReceiptUrlInvalid,
	isPayerInnInvalid,
	isTaxDeductionRequested,
	missingTaxDeductionLabels,
	missingTaxDeductionSteps,
	type TaxDeductionFields,
} from "./fiscalReceiptRequirements";

/**
 * ЧЕК ДЛЯ ВЫЧЕТА: НАЗВАНИЯ РЕКВИЗИТОВ И ЕДИНСТВО ПРОВЕРКИ.
 *
 * Проверяем то, из-за чего кассир не мог заполнить чек:
 *  1. на экране стояли несуществующие сокращения «ФО» и «НФД»;
 *  2. один и тот же список полей жил в двух копиях и уже разошёлся.
 */

/** Полностью заполненный чек: от него отнимаем по одному полю. */
const filled: TaxDeductionFields = {
	fiscalReceiptIssuedAt: "2026-07-28T12:00",
	fiscalFn: "9999078902004062",
	fiscalFd: "12345",
	fiscalFpd: "1234567890",
	payerFullName: "Иванова Мария Петровна",
	payerBirthDate: "1958-03-14",
	payerIdentityDocument: "паспорт 45 08 123456",
	payerRelationship: "мать",
};

describe("названия фискальных реквизитов", () => {
	/*
	 * БЫЛО: «ФО (номер фискального накопителя)» и «Ссылка НФД (https://...)».
	 * Ни «ФО», ни «НФД» на чеке не напечатано и в фискальной технике таких
	 * сокращений нет — накопитель это ФН, оператор фискальных данных это ОФД.
	 */
	it("накопитель называется ФН, а не ФО", () => {
		assert.equal(fiscalFieldLabels.fn, "ФН (номер фискального накопителя)");
		for (const label of Object.values(fiscalFieldLabels)) {
			assert.ok(!/\bФО\b/.test(label), `осталось несуществующее «ФО»: ${label}`);
		}
	});

	it("оператор фискальных данных называется ОФД, а не НФД", () => {
		assert.equal(fiscalFieldLabels.receiptUrl, "Ссылка ОФД (https://...)");
		for (const label of Object.values(fiscalFieldLabels)) {
			assert.ok(!label.includes("НФД"), `осталось несуществующее «НФД»: ${label}`);
		}
		assert.ok(!fiscalReceiptUrlErrorText.includes("НФД"));
	});

	it("сокращение всегда с расшифровкой: кассир сверяет с бумажным чеком", () => {
		assert.ok(fiscalFieldLabels.fn.includes("фискального накопителя"));
		assert.ok(fiscalFieldLabels.fd.includes("фискального документа"));
		assert.ok(fiscalFieldLabels.fpd.includes("фискальный признак"));
	});

	it("в названиях полей нет латиницы", () => {
		for (const label of Object.values(fiscalFieldLabels)) {
			// Кроме схемы адреса в подсказке к ссылке — это часть самого адреса.
			const withoutUrlScheme = label.replace("https://...", "");
			assert.ok(
				!/[A-Za-z]/.test(withoutUrlScheme),
				`латиница в названии поля: ${label}`,
			);
		}
	});
});

describe("чего не хватает для вычета", () => {
	it("на полном чеке не требует ничего", () => {
		assert.deepEqual(missingTaxDeductionSteps(filled), []);
		assert.deepEqual(missingTaxDeductionLabels(filled), []);
	});

	it("называет каждое незаполненное поле по-человечески", () => {
		assert.deepEqual(missingTaxDeductionSteps({ ...filled, fiscalFn: "" }), [
			"для вычета укажите ФН — номер фискального накопителя",
		]);
		assert.deepEqual(
			missingTaxDeductionSteps({ ...filled, payerBirthDate: "" }),
			["для вычета укажите дату рождения плательщика"],
		);
	});

	it("пробелы вместо значения — это не заполнено", () => {
		assert.equal(missingTaxDeductionSteps({ ...filled, fiscalFd: "   " }).length, 1);
	});

	/*
	 * Главное: экран и запись оплаты спрашивают ОДИН И ТОТ ЖЕ состав полей.
	 * Разойдись они — кнопка «Принять оплату» станет доступной, а сервер оплату
	 * отклонит, и оплата будет выглядеть принятой, не будучи принятой.
	 */
	it("экран и запись оплаты требуют один и тот же состав полей", () => {
		const keys = Object.keys(filled) as (keyof TaxDeductionFields)[];
		for (const key of keys) {
			const broken = { ...filled, [key]: "" };
			assert.equal(
				missingTaxDeductionSteps(broken).length,
				missingTaxDeductionLabels(broken).length,
				`состав разошёлся на поле ${key}`,
			);
		}
		const allEmpty = keys.reduce(
			(accumulator, key) => ({ ...accumulator, [key]: "" }),
			{} as TaxDeductionFields,
		);
		assert.equal(missingTaxDeductionSteps(allEmpty).length, keys.length);
		assert.equal(missingTaxDeductionLabels(allEmpty).length, keys.length);
	});

	it("порядок — как поля стоят на экране, сверху вниз", () => {
		const allEmpty = (Object.keys(filled) as (keyof TaxDeductionFields)[]).reduce(
			(accumulator, key) => ({ ...accumulator, [key]: "" }),
			{} as TaxDeductionFields,
		);
		assert.deepEqual(missingTaxDeductionLabels(allEmpty), [
			"дата фискального чека",
			"ФН",
			"ФД",
			"ФПД",
			"ФИО плательщика",
			"дата рождения плательщика",
			"документ плательщика",
			"родство плательщика",
		]);
	});
});

describe("запрошен ли вычет", () => {
	it("коды услуг 1 и 2 — да, «не выбран» — нет", () => {
		assert.equal(isTaxDeductionRequested("1"), true);
		assert.equal(isTaxDeductionRequested("2"), true);
		assert.equal(isTaxDeductionRequested(""), false);
		assert.equal(isTaxDeductionRequested(null), false);
		assert.equal(isTaxDeductionRequested(undefined), false);
	});
});

describe("проверка ссылки ОФД и ИНН", () => {
	it("пустая ссылка допустима, непустая обязана быть адресом", () => {
		assert.equal(isFiscalReceiptUrlInvalid(""), false);
		assert.equal(isFiscalReceiptUrlInvalid("   "), false);
		assert.equal(isFiscalReceiptUrlInvalid("https://nalog.ru/check"), false);
		assert.equal(isFiscalReceiptUrlInvalid("http://ofd.ru/x"), false);
		assert.equal(isFiscalReceiptUrlInvalid("nalog.ru/check"), true);
		assert.equal(isFiscalReceiptUrlInvalid("посмотреть на сайте"), true);
	});

	it("ИНН пустой допустим, непустой — строго 10 или 12 цифр", () => {
		assert.equal(isPayerInnInvalid(""), false);
		assert.equal(isPayerInnInvalid("7707083893"), false);
		assert.equal(isPayerInnInvalid("770708389312"), false);
		assert.equal(isPayerInnInvalid("77070838"), true);
		assert.equal(isPayerInnInvalid("7707083893123"), true);
	});
});
