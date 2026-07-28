import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	familyMutationId,
	familyPayRequestKey,
	familyTopupRequestKey,
	type MutationTicketRef,
} from "./familyWalletMutationKey";

/**
 * КЛЮЧ ПОВТОРА ПРОВЕРЯЕТСЯ ПРОГОНОМ, А НЕ ЧТЕНИЕМ.
 *
 * Здесь ровно два способа потерять деньги, и оба проверяются ниже:
 *  1. ключ обновился там, где его обновлять нельзя, — повтор после обрыва связи
 *     списывает с семейного счёта второй раз за одно лечение;
 *  2. ключ уцелел там, где он должен был смениться, — сервер узнаёт старый ключ,
 *     денег не двигает и отвечает успехом. Панель пишет «Оплата списана», а не
 *     списано ничего: долг открыт, оплаты в журнале нет, человека отпустили.
 *
 * Второй случай и был настоящей поломкой: ключ жил на всю панель и переживал и
 * смену пациента, и смену суммы.
 */

/** Счётчик вместо случайного uuid: проверяем именно «тот же ключ или новый». */
function countingIds(): () => string {
	let issued = 0;
	return () => {
		issued += 1;
		return `id-${issued}`;
	};
}

const IVANOV = "11111111-1111-4111-8111-111111111111";
const PETROV = "22222222-2222-4222-8222-222222222222";
const FAMILY = "33333333-3333-4333-8333-333333333333";
const OTHER_FAMILY = "44444444-4444-4444-8444-444444444444";

describe("familyMutationId", () => {
	it("повтор той же попытки уходит с тем же ключом: иначе спишет дважды", () => {
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();
		const key = familyPayRequestKey(IVANOV, FAMILY, 15000);

		const first = familyMutationId(ref, "family-pay", key, nextId);
		const retry = familyMutationId(ref, "family-pay", key, nextId);

		assert.equal(first, "family-pay-id-1");
		assert.equal(retry, first);
	});

	it("другой пациент с той же суммой получает новый ключ", () => {
		// Та самая поломка: 15 000 ₽ у Иванова не ответили, ключ сохранился, и
		// списание тех же 15 000 ₽ у Петрова сервер зачёл бы как повтор — успех без
		// списания.
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();

		const forIvanov = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 15000),
			nextId,
		);
		const forPetrov = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(PETROV, OTHER_FAMILY, 15000),
			nextId,
		);

		assert.notEqual(forPetrov, forIvanov);
		assert.equal(forPetrov, "family-pay-id-2");
	});

	it("та же семья, но другой пациент — тоже новый ключ", () => {
		// Мать и ребёнок в одной семье: семейная группа и сумма совпадают, платёж
		// записывается разным людям. Одним ключом эти две оплаты быть не могут.
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();

		const forMother = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 1000),
			nextId,
		);
		const forChild = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(PETROV, FAMILY, 1000),
			nextId,
		);

		assert.notEqual(forChild, forMother);
	});

	it("изменённая сумма у того же пациента получает новый ключ", () => {
		// Повтор «на 3 000 ₽» после неотвеченных 500 ₽ подтверждался успехом, хотя
		// списаны были прежние 500 ₽.
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();

		const small = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 500),
			nextId,
		);
		const larger = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 3000),
			nextId,
		);

		assert.notEqual(larger, small);
	});

	it("после успеха ключ обнуляется, и такая же оплата проходит как новая", () => {
		// Пациент платит 1 000 ₽ дважды за день по двум разным работам. Второй
		// платёж обязан пройти, а не быть отвергнутым как повтор.
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();
		const key = familyPayRequestKey(IVANOV, FAMILY, 1000);

		const paid = familyMutationId(ref, "family-pay", key, nextId);
		ref.current = null; // так делает панель после успешного ответа
		const paidAgain = familyMutationId(ref, "family-pay", key, nextId);

		assert.notEqual(paidAgain, paid);
	});

	it("сумма «1000» и «1000.0» — одна операция, а не две", () => {
		const ref: MutationTicketRef = { current: null };
		const nextId = countingIds();

		const asInteger = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 1000),
			nextId,
		);
		const asFloat = familyMutationId(
			ref,
			"family-pay",
			familyPayRequestKey(IVANOV, FAMILY, 1000.0),
			nextId,
		);

		assert.equal(asFloat, asInteger);
	});
});

describe("подписи операций", () => {
	it("пополнение и списание одной суммы не одна операция", () => {
		// Иначе неотвеченное пополнение зачло бы следующее списание как повтор.
		assert.notEqual(
			familyPayRequestKey(IVANOV, FAMILY, 5000),
			familyTopupRequestKey(IVANOV, FAMILY, 5000, "cash"),
		);
	});

	it("тот же аванс, но другим способом — другая операция", () => {
		// Способ попадает в журнал платежей и в вечернюю сверку кассы: зачесть
		// пополнение картой как повтор наличных нельзя, иначе в ящике не сойдётся.
		assert.notEqual(
			familyTopupRequestKey(IVANOV, FAMILY, 5000, "cash"),
			familyTopupRequestKey(IVANOV, FAMILY, 5000, "card"),
		);
	});

	it("одинаковые операции дают одинаковую подпись", () => {
		assert.equal(
			familyTopupRequestKey(IVANOV, FAMILY, 5000, "cash"),
			familyTopupRequestKey(IVANOV, FAMILY, 5000, "cash"),
		);
	});
});
