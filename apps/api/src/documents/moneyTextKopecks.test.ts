import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
	CreateDocumentInput,
	GeneratedDocument,
	Payment,
	TreatmentPlanItem,
} from "@dental/shared";
import {
	createTestGeneratedDocument,
	createTestPayment,
	createTestTreatmentPlanItem,
} from "./testDocumentFixtures.js";
import {
	type DocumentCreationFacts,
	paymentRefundCorrectionSelectionErrorForDocument,
	plannedAmountRubForDocument,
	validateDocumentCreation,
} from "./guards.js";

/**
 * Деньги в тексте отказа — до копейки, а не как их печатает JS.
 *
 * ЗАЧЕМ ЭТИ ТЕСТЫ. Сообщения об отказе в `guards.ts` подставляли рублёвое число
 * в русскую фразу напрямую. Числа в них приходят из сложения и вычитания сумм с
 * плавающей точкой, поэтому врач читал «уже возвращено 900.1299999999999 руб.»
 * и «доступно 99.87000000000012 руб.» — в сообщении, вся работа которого
 * объяснить отказ по денежному документу.
 *
 * Набор 300.01 + 300.05 + 300.07 выбран не наугад: именно он даёт
 * 900.1299999999999 в этом порядке сложения и 900.13 в обратном. Контрольный
 * замер стоит в каждом тесте прямо перед проверкой сообщения, поэтому дрейф
 * здесь — измеренный факт, а не предположение.
 *
 * Каждый тест проверяет ДВЕ вещи: что в сообщении есть человеческая сумма и что
 * в нём НЕТ сырого числа. Вторая проверка и есть доказательство: откати печать
 * через `kopecksToNumericString(parseKopecks(...))` — и она падает.
 *
 * ИСКЛЮЧЕНИЕ — «смета 900.13 против дрейфующего плана» ниже: у неё сообщения
 * больше нет вовсе, потому что после перевода плана в целые копейки законная
 * смета проходит ворота и отказ не выдаётся. Печать суммы в отказе по смете
 * осталась под тестом «полтинник печатается как 1500.50».
 *
 * Сравнения тесты НЕ проверяют и не закрепляют: они идут в целых копейках без
 * допуска, и это отдельная гарантия.
 */

const driftingRefunds = [300.01, 300.05, 300.07];
/** Ровно то, что даёт прежний код: сложение рублей в плавающей точке. */
const driftingSumRub = driftingRefunds.reduce(
	(total, amount) => total + amount,
	0,
);

function paidPayment(amountRub: number): Payment {
	return createTestPayment({
		id: "payment-1",
		patientId: "patient-1",
		visitId: "visit-1",
		status: "paid",
		amountRub,
		fiscalReceiptNumber: "ФЧ-1",
		fiscalReceiptIssuedAt: "2026-03-01T10:00:00Z",
	});
}

function issuedRefund(index: number, amountRub: number): GeneratedDocument {
	return createTestGeneratedDocument({
		id: `refund-${index + 1}`,
		kind: "payment_refund_correction_request",
		status: "issued",
		payload: {
			paymentRefundCorrection: {
				action: "full_refund",
				selectedPaymentIds: ["payment-1"],
				amountRub,
				reason: "test",
				refundMethod: "card",
				recipientFullName: "Иванов Иван Иванович",
				recipientIdentityDocument: "Паспорт 11 22 333444",
				originalFiscalReceiptNumber: "ФЧ-1",
				accountantDecision: "Одобрено",
			},
		},
	});
}

function refundRequest(amountRub: number): CreateDocumentInput {
	return {
		patientId: "patient-1",
		kind: "payment_refund_correction_request",
		payload: {
			paymentRefundCorrection: {
				action: "full_refund",
				selectedPaymentIds: ["payment-1"],
				amountRub,
				reason: "test",
				refundMethod: "card",
				recipientFullName: "Иванов Иван Иванович",
				recipientIdentityDocument: "Паспорт 11 22 333444",
				originalFiscalReceiptNumber: "ФЧ-1",
				accountantDecision: "Одобрено",
			},
		},
	};
}

describe("отказ по возврату печатает копейки, а не дрейф double", () => {
	test("три возврата 300.01 + 300.05 + 300.07 показываются как 900.13, остаток как 99.87", () => {
		// Контрольный замер: сумма прошлых возвратов действительно дрейфует.
		assert.equal(driftingSumRub, 900.1299999999999);
		// И остаток по чеку на 1000 руб. дрейфует вслед за ней.
		assert.equal(1000 - driftingSumRub, 99.87000000000012);

		const error = paymentRefundCorrectionSelectionErrorForDocument(
			refundRequest(200),
			[paidPayment(1000)],
			driftingRefunds.map((amount, index) => issuedRefund(index, amount)),
		);

		assert.ok(error, "ожидался отказ: 200 руб. больше остатка 99.87 руб.");
		assert.ok(error.includes("уже возвращено 900.13 руб."), error);
		assert.ok(error.includes("доступно 99.87 руб."), error);
		assert.ok(error.includes("из 1000.00 руб."), error);
		// Доказательство правки: сырых чисел в тексте для человека больше нет.
		assert.ok(!error.includes("900.1299999999999"), error);
		assert.ok(!error.includes("99.87000000000012"), error);
	});

	test("чек, возвращённый ровно целиком, назван закрытым, а не «доступно 0.00 руб.»", () => {
		/*
		 * ЗДЕСЬ ОЖИДАНИЕ ИЗМЕНИЛОСЬ ВМЕСТЕ С ПРАВКОЙ ОСТАТКА, И ЭТО НЕ ПОСЛАБЛЕНИЕ.
		 *
		 * Контрольный замер тот же: чек на 900.13 руб. возвращён частями 300.01 +
		 * 300.05 + 300.07, и в плавающей точке эта сумма равна 900.1299999999999,
		 * поэтому остаток по чеку выходил 1.1368683772161603e-13 — ПОЛОЖИТЕЛЬНЫМ. Из
		 * этого следовал абсурд, который прежнее ожидание и закрепляло: полностью
		 * возвращённый чек считался ещё возвратным, отказ приходил из ветки
		 * «превышает остаток» и сообщал бухгалтеру «доступно 0.00 руб.» — фраза,
		 * которая противоречит сама себе и не объясняет ничего.
		 *
		 * Остаток теперь считается в целых копейках: 90013 − 90013 = 0, и чек назван
		 * закрытым. Прежнее ожидание закрепляло артефакт double, а не поведение;
		 * проверка текста на отсутствие сырых чисел осталась на месте.
		 */
		const residueRub = 900.13 - driftingSumRub;
		assert.equal(residueRub, 1.1368683772161603e-13);
		assert.ok(
			residueRub > 0,
			"контрольный замер: в рублях остаток по закрытому чеку был положительным",
		);

		const error = paymentRefundCorrectionSelectionErrorForDocument(
			refundRequest(100),
			[paidPayment(900.13)],
			driftingRefunds.map((amount, index) => issuedRefund(index, amount)),
		);

		assert.ok(
			error,
			"ожидался отказ: чек возвращён целиком, возвращать нечего",
		);
		assert.ok(
			error.includes("Свободного остатка для возврата нет."),
			"чек возвращён ровно целиком (90013 коп. из 90013 коп.) и обязан быть назван закрытым. Отказ " +
				"«доступно 0.00 руб.» означает, что остаток снова считается в рублях и мусор 1e-13 держит " +
				`закрытый чек открытым. Получено: ${error}`,
		);
		assert.ok(error.includes("По чеку на 900.13 руб."), error);
		assert.ok(error.includes("уже возвращено 900.13 руб."), error);
		// Экспоненциальная запись в денежной фразе — то, что читал врач.
		assert.ok(!error.includes("e-13"), error);
		assert.ok(!error.includes("900.1299999999999"), error);
	});
});

describe("отказ по смете печатает копейки", () => {
	function estimateInput(
		totalAmountRub: number,
		lineAmountsRub: readonly number[],
	): CreateDocumentInput {
		return {
			patientId: "patient-1",
			visitId: "visit-1",
			kind: "treatment_cost_estimate",
			payload: {
				treatmentCostEstimate: {
					estimateNumber: "СМ-1",
					estimateDate: "2026-03-01T10:00:00Z",
					patientOrPayerFullName: "Иванов Иван Иванович",
					treatmentBasis: "План лечения",
					totalAmountRub,
					serviceLines: lineAmountsRub.map((amountRub) => ({
						serviceName: "Услуга",
						quantity: 1,
						unitPriceRub: amountRub,
						discountRub: 0,
						totalRub: amountRub,
					})),
					estimateValidUntil: "2026-04-01T10:00:00Z",
					priceChangeRules: "Цена действительна в течение месяца",
					excludedItems: ["Не включены дополнительные исследования"],
					paymentMilestoneNotes: "Оплата по этапам лечения",
					responsibleDoctorFullName: "Петров Петр Петрович",
					signedAt: "2026-03-01T10:00:00Z",
					patientUnderstandsPreliminaryEstimate: true,
					serviceScopeMatchesTreatmentPlan: true,
					estimateDoesNotReplaceContractOrFiscalReceipt: true,
					changesRequireUpdatedEstimate: true,
				},
			},
		};
	}

	function factsWithPlanned(plannedAmountRub: number): DocumentCreationFacts {
		return {
			patient: { id: "patient-1" },
			visit: { id: "visit-1", patientId: "patient-1" },
			paidAmountRub: 0,
			plannedAmountRub,
		};
	}

	function planItem(unitPriceRub: number): TreatmentPlanItem {
		return createTestTreatmentPlanItem({
			patientId: "patient-1",
			visitId: "visit-1",
			status: "proposed",
			unitPriceRub,
			quantity: 1,
			discountRub: 0,
		});
	}

	test("смета 900.13 против дрейфующего плана: план в копейках, ложного отказа нет", () => {
		/*
		 * ОЖИДАНИЕ ИЗМЕНИЛОСЬ ВМЕСТЕ С ПЕРЕВОДОМ ПЛАНА В ЦЕЛЫЕ КОПЕЙКИ, И ЭТО НЕ
		 * ПОСЛАБЛЕНИЕ: равенство осталось строгим, допуска не добавлено ни одного.
		 *
		 * ПРЕЖНЕЕ ОЖИДАНИЕ ЗАКРЕПЛЯЛО ДЕФЕКТ. Стояло
		 * `assert.equal(plannedAmountRub, 900.1299999999999)`, то есть тест ТРЕБОВАЛ
		 * от продакшн-кода накопленную ошибку двоичной дроби — при том, что имя
		 * теста называет смету суммой 900.13. Следом он требовал 409 «сумма 900.13
		 * руб. не совпадает с актуальным планом лечения 900.13 руб.»: отказ, в
		 * котором ОБА напечатанных числа одинаковы. Это и есть ложный отказ на
		 * законной смете — 300.01 + 300.05 + 300.07 равно 900.13 до копейки, а
		 * сравнение шло в рублях и видело разницу 1.1e-13.
		 *
		 * СТАЛО: `plannedAmountRubForDocument` складывает позиции целыми копейками
		 * (30001 + 30005 + 30007 = 90013 коп.) и отдаёт ровно 900.13, а ворота
		 * пропускают документ. Замер 2026-08-06 на этих же данных: план 900.13
		 * (`=== 900.13` истинно), `validateDocumentCreation` → `ok: true`, тогда как
		 * с прежним плановым числом 900.1299999999999 те же ворота отдают 409.
		 */
		const input = estimateInput(900.13, driftingRefunds);
		// Плановую сумму считает продакшн-код — дрейф не подставлен руками.
		const plannedAmountRub = plannedAmountRubForDocument(
			"treatment_cost_estimate",
			input,
			driftingRefunds.map(planItem),
		);
		// Контрольный замер: те же три числа, сложенные в рублях, дрейфуют.
		assert.equal(driftingSumRub, 900.1299999999999);
		// А план — нет. Равенство строгое: арифметика в целых копейках точна.
		assert.equal(plannedAmountRub, 900.13);
		assert.notEqual(plannedAmountRub, driftingSumRub);

		const result = validateDocumentCreation(
			input,
			factsWithPlanned(plannedAmountRub),
		);
		assert.ok(
			result.ok,
			result.ok
				? ""
				: "смета совпадает с планом до копейки (90013 коп. из 90013 коп.) и обязана пройти " +
						`ворота. Отказ означает, что сравнение снова идёт в рублях. Получено ${result.statusCode}: ${result.error}`,
		);
	});

	test("полтинник печатается как 1500.50, а не как 1500.5", () => {
		const result = validateDocumentCreation(
			estimateInput(1500.5, [1500.5]),
			factsWithPlanned(1400.5),
		);
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.match(result.error, /сумма 1500\.50 руб\./);
		assert.match(result.error, /планом лечения 1400\.50 руб\./);
		// Прежний вид: «сумма 1500.5 руб.» — рубль с одним знаком после точки.
		assert.doesNotMatch(result.error, /сумма 1500\.5 руб\./);
		assert.doesNotMatch(result.error, /планом лечения 1400\.5 руб\./);
	});
});
