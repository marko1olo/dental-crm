import assert from "node:assert";
import test from "node:test";
import {
	normalizeRubAmountInput,
	rubAmountInputMissingStep,
	validateRubAmountInput,
} from "../rubAmountInput.js";

/*
 * Ввод суммы в кассе. До правки поле пропускало только цифры без разделителя и
 * отвечало «укажите сумму целыми рублями без копеек»: принять 1500,50 или 0,50
 * было нельзя вообще. Проверки ниже закрепляют копейки и то, что лишняя
 * точность отвергается, а не округляется молча.
 */
test("normalizeRubAmountInput: целые рубли", () => {
	assert.strictEqual(normalizeRubAmountInput("100"), 100);
	assert.strictEqual(normalizeRubAmountInput("1 000"), 1000);
	assert.strictEqual(normalizeRubAmountInput("1 000"), 1000);

	assert.strictEqual(normalizeRubAmountInput(""), null);
	assert.strictEqual(normalizeRubAmountInput("   "), null);
	assert.strictEqual(normalizeRubAmountInput("abc"), null);
	assert.strictEqual(normalizeRubAmountInput("-100"), null);
});

test("normalizeRubAmountInput: копейки", () => {
	assert.strictEqual(normalizeRubAmountInput("1500,50"), 1500.5);
	assert.strictEqual(normalizeRubAmountInput("1500.50"), 1500.5);
	assert.strictEqual(normalizeRubAmountInput("1 500,50"), 1500.5);
	assert.strictEqual(normalizeRubAmountInput("1 500,50"), 1500.5);
	assert.strictEqual(normalizeRubAmountInput("0,01"), 0.01);
	assert.strictEqual(normalizeRubAmountInput("0,50"), 0.5);
	assert.strictEqual(normalizeRubAmountInput("0,5"), 0.5);
	assert.strictEqual(normalizeRubAmountInput("100,00"), 100);
});

test("normalizeRubAmountInput: лишняя точность и мусор", () => {
	// Три знака — это не деньги. Округлять за пользователя нельзя.
	assert.strictEqual(normalizeRubAmountInput("10,005"), null);
	assert.strictEqual(normalizeRubAmountInput("1,2345"), null);
	assert.strictEqual(normalizeRubAmountInput("1,"), null);
	assert.strictEqual(normalizeRubAmountInput(",50"), null);
	assert.strictEqual(normalizeRubAmountInput("1,2,3"), null);
	assert.strictEqual(normalizeRubAmountInput("1e3"), null);

	// За пределом точного представления копеек — отказ, а не потеря разрядов.
	assert.strictEqual(normalizeRubAmountInput("90071992547409,92"), null);
});

test("validateRubAmountInput", () => {
	assert.strictEqual(validateRubAmountInput("100"), null);
	assert.strictEqual(validateRubAmountInput("1 000"), null);
	assert.strictEqual(validateRubAmountInput("1500,50"), null);
	assert.strictEqual(validateRubAmountInput("0,01"), null);

	assert.strictEqual(validateRubAmountInput(""), "укажите сумму больше нуля");
	assert.strictEqual(
		validateRubAmountInput("   "),
		"укажите сумму больше нуля",
	);
	assert.strictEqual(validateRubAmountInput("0"), "укажите сумму больше нуля");
	assert.strictEqual(
		validateRubAmountInput("0,00"),
		"укажите сумму больше нуля",
	);

	const formatMessage =
		"сумма указывается цифрами, копейки после запятой: 1500,50";
	assert.strictEqual(validateRubAmountInput("abc"), formatMessage);
	assert.strictEqual(validateRubAmountInput("10,005"), formatMessage);
	assert.strictEqual(validateRubAmountInput("-100"), formatMessage);

	assert.strictEqual(
		validateRubAmountInput("0", "custom zero msg", "custom invalid msg"),
		"custom zero msg",
	);
	assert.strictEqual(
		validateRubAmountInput("abc", "custom zero msg", "custom invalid msg"),
		"custom invalid msg",
	);
});

test("rubAmountInputMissingStep", () => {
	assert.strictEqual(rubAmountInputMissingStep(100, 10), false);
	assert.strictEqual(rubAmountInputMissingStep(100, 50), false);
	assert.strictEqual(rubAmountInputMissingStep(100, 100), false);

	assert.strictEqual(rubAmountInputMissingStep(100, 30), true);
	assert.strictEqual(rubAmountInputMissingStep(105, 10), true);

	assert.strictEqual(rubAmountInputMissingStep(0, 10), false);
	assert.strictEqual(rubAmountInputMissingStep(null, 10), false);
	assert.strictEqual(rubAmountInputMissingStep(undefined, 10), false);

	// Кратность на копейках: остаток от деления дробных чисел неточен, и
	// 1500.5 % 0.5 на плавающей точке не ноль.
	assert.strictEqual(rubAmountInputMissingStep(1500.5, 0.5), false);
	assert.strictEqual(rubAmountInputMissingStep(1500.5, 0.01), false);
	assert.strictEqual(rubAmountInputMissingStep(1500.55, 0.1), true);
});
