import assert from "node:assert";
import test from "node:test";
import {
	normalizeRubAmountInput,
	rubAmountInputMissingStep,
	validateRubAmountInput,
} from "../rubAmountInput.js";

test("normalizeRubAmountInput", () => {
	assert.strictEqual(normalizeRubAmountInput("100"), 100);
	assert.strictEqual(normalizeRubAmountInput("1 000"), 1000);
	assert.strictEqual(normalizeRubAmountInput("1\u00A0000"), 1000);

	assert.strictEqual(normalizeRubAmountInput(""), null);
	assert.strictEqual(normalizeRubAmountInput("   "), null);
	assert.strictEqual(normalizeRubAmountInput("abc"), null);
	assert.strictEqual(normalizeRubAmountInput("100.5"), null);
	assert.strictEqual(normalizeRubAmountInput("-100"), null);

	assert.strictEqual(normalizeRubAmountInput("9007199254740992"), null);
});

test("validateRubAmountInput", () => {
	assert.strictEqual(validateRubAmountInput("100"), null);
	assert.strictEqual(validateRubAmountInput("1 000"), null);

	assert.strictEqual(validateRubAmountInput(""), "укажите сумму больше нуля");
	assert.strictEqual(
		validateRubAmountInput("   "),
		"укажите сумму больше нуля",
	);

	assert.strictEqual(
		validateRubAmountInput("abc"),
		"укажите сумму целыми рублями без копеек",
	);
	assert.strictEqual(
		validateRubAmountInput("100.5"),
		"укажите сумму целыми рублями без копеек",
	);

	assert.strictEqual(validateRubAmountInput("0"), "укажите сумму больше нуля");
	assert.strictEqual(
		validateRubAmountInput("-100"),
		"укажите сумму целыми рублями без копеек",
	);

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
});
