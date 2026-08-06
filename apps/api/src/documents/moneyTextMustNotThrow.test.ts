import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CreateDocumentInput, Patient, Visit } from "@dental/shared";
import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import {
	type DocumentCreationFacts,
	moneyKopecksText,
	moneyRubText,
	validateDocumentCreation,
} from "./guards.js";

/**
 * Текст отказа обязан объяснять отказ, а не бросать исключение.
 *
 * ЗАЧЕМ ЭТИ ТЕСТЫ. Одиннадцать денежных подстановок в `guards.ts` стоят внутри
 * построителей сообщений об отказе. Печать шла через
 * `kopecksToNumericString(parseKopecks(x))`, а `parseKopecks` по контракту бросает
 * на NaN и Infinity — контрольный замер этого стоит первым тестом ниже. То есть
 * повреждённое значение давало не кривое число, а исключение из ворот: вежливый
 * 409 «сумма не совпадает» превращался в 500 без текста, и клиника не получала
 * никакого объяснения.
 *
 * Тесты закрепляют три вещи: печать не бросает никогда, заглушка отличима от
 * законного `0.00`, и все значения, которые печатались правильно, печатаются
 * ровно так же.
 */

describe("контрольный замер: прежняя печать действительно бросает", () => {
	test("kopecksToNumericString(parseKopecks(NaN)) бросает, а не печатает", () => {
		assert.throws(() => kopecksToNumericString(parseKopecks(Number.NaN)), {
			message: "Денежное значение не является числом: NaN",
		});
		assert.throws(() =>
			kopecksToNumericString(parseKopecks(Number.POSITIVE_INFINITY)),
		);
	});
});

describe("moneyRubText не бросает", () => {
	test("NaN печатается заглушкой, а не исключением", () => {
		let printed = "";
		assert.doesNotThrow(() => {
			printed = moneyRubText(Number.NaN);
		});
		assert.equal(printed, "?.??");
	});

	test("Infinity и -Infinity печатаются заглушкой", () => {
		assert.doesNotThrow(() => moneyRubText(Number.POSITIVE_INFINITY));
		assert.doesNotThrow(() => moneyRubText(Number.NEGATIVE_INFINITY));
		assert.equal(moneyRubText(Number.POSITIVE_INFINITY), "?.??");
		assert.equal(moneyRubText(Number.NEGATIVE_INFINITY), "?.??");
	});

	test("строка, не похожая на деньги, печатается заглушкой", () => {
		assert.doesNotThrow(() => moneyRubText("тысяча"));
		assert.equal(moneyRubText("тысяча"), "?.??");
		// Три знака после точки — повреждение numeric(12, 2), тоже не повод бросать.
		assert.equal(moneyRubText("100.005"), "?.??");
	});

	test("заглушка не выдаёт себя за сумму и не пишет undefined", () => {
		const printed = moneyRubText(Number.NaN);
		assert.doesNotMatch(printed, /undefined/);
		assert.doesNotMatch(printed, /NaN/);
		// Главное: заглушка НЕ равна законному нулю. `0.00` означало бы «сумма ноль»,
		// а это ложь, за которой врач пошёл бы искать ноль в данных.
		assert.notEqual(printed, "0.00");
		assert.equal(moneyRubText(null), "0.00");
		assert.equal(moneyRubText(undefined), "0.00");
	});
});

describe("рабочие значения печатаются как раньше", () => {
	test("1500.5 остаётся 1500.50", () => {
		assert.equal(moneyRubText(1500.5), "1500.50");
	});

	test("дрейфующая сумма 900.1299999999999 остаётся 900.13", () => {
		// Замер, а не предположение: сложение рублей в плавающей точке.
		const driftingSumRub = [300.01, 300.05, 300.07].reduce(
			(total, amount) => total + amount,
			0,
		);
		assert.equal(driftingSumRub, 900.1299999999999);
		assert.equal(moneyRubText(driftingSumRub), "900.13");
	});

	test("копейки печатаются тем же кодом и тоже не бросают", () => {
		assert.equal(moneyKopecksText(90_013), "900.13");
		assert.equal(moneyKopecksText(150_050), "1500.50");
		assert.doesNotThrow(() => moneyKopecksText(Number.NaN));
		assert.equal(moneyKopecksText(Number.NaN), "?.??");
		// Нецелые копейки — тоже повреждение, и тоже не повод потерять объяснение.
		assert.equal(moneyKopecksText(90_013.5), "?.??");
	});
});

describe("ворота отдают 409 с текстом, а не исключение", () => {
	function installmentInput(remainingAmountRub: number): CreateDocumentInput {
		return {
			patientId: "patient-1",
			visitId: "visit-1",
			kind: "installment_payment_schedule",
			payload: {
				installmentPaymentSchedule: {
					totalAmountRub: 1000,
					prepaidAmountRub: 0,
					remainingAmountRub,
					installments: [],
				},
			},
		} as unknown as CreateDocumentInput;
	}

	const facts: DocumentCreationFacts = {
		patient: { id: "patient-1" } as unknown as Patient,
		visit: { id: "visit-1", patientId: "patient-1" } as unknown as Visit,
		paidAmountRub: 0,
		plannedAmountRub: 0,
	};

	test("бесконечный остаток в графике рассрочки объясняется, а не роняет ворота", () => {
		let result: ReturnType<typeof validateDocumentCreation> | null = null;
		assert.doesNotThrow(() => {
			result = validateDocumentCreation(
				installmentInput(Number.POSITIVE_INFINITY),
				facts,
			);
		});
		assert.ok(result, "ворота обязаны вернуть решение, а не бросить");
		const decision = result as ReturnType<typeof validateDocumentCreation>;
		assert.equal(decision.ok, false);
		if (decision.ok) return;
		assert.equal(decision.statusCode, 409);
		assert.match(decision.error, /График рассрочки: остаток \?\.\?\? руб\./);
		assert.doesNotMatch(decision.error, /Infinity/);
	});

	test("рабочий график с расхождением по-прежнему называет обе суммы", () => {
		const result = validateDocumentCreation(installmentInput(900.5), facts);
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.equal(
			result.error,
			"График рассрочки: остаток 900.50 руб. не совпадает с суммой минус предоплатой 1000.00 руб.",
		);
	});
});
