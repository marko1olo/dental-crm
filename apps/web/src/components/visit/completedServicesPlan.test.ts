import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	parseRubAmount,
	planLineQuantity,
	planLineTotalRub,
	visitOwnedPlanItems,
} from "./completedServicesPlan";
import { NIL_UUID, realVisitFieldId } from "./visitIdentity";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Список «Отметка выполненного по плану лечения» внутри
 * приёма показывал план лечения ДРУГОГО пациента — того, кто остался выбранным в
 * разделе «Пациенты». Галочка дописывала «Выполнено: <чужая услуга> — <чужая
 * цена>» в поле «План» текущего приёма, откуда строка уходила в ЭМК и в кассу.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/completedServicesPlan.test.ts
 */

const item = (patientId: string, name: string, status = "planned") => ({
	id: `${patientId}-${name}`,
	patientId,
	snapshotServiceName: name,
	status,
	unitPriceRub: "1500.00",
	quantity: 1,
	discountRub: "0",
});

describe("позиции плана для отметки выполненного", () => {
	it("чужие позиции не попадают в список приёма", () => {
		const items = [
			item("пациент-А", "Лечение кариеса 26"),
			item("пациент-Б", "Удаление 48"),
			item("пациент-Б", "Имплантация 46"),
		];

		const forA = visitOwnedPlanItems(items, "пациент-А");
		assert.deepEqual(
			forA.map((entry) => entry.snapshotServiceName),
			["Лечение кариеса 26"],
		);
		// И наоборот: приём пациента Б не видит позиций пациента А.
		assert.deepEqual(
			visitOwnedPlanItems(items, "пациент-Б").map(
				(entry) => entry.snapshotServiceName,
			),
			["Удаление 48", "Имплантация 46"],
		);
	});

	it("без пациента открытого приёма отмечать нечего", () => {
		const items = [item("пациент-А", "Лечение кариеса 26")];
		assert.deepEqual(visitOwnedPlanItems(items, null), []);
		// Заготовка приёма из гидратации базы приёмом не считается.
		assert.deepEqual(
			visitOwnedPlanItems(items, realVisitFieldId(NIL_UUID)),
			[],
		);
		assert.deepEqual(visitOwnedPlanItems(items, realVisitFieldId("   ")), []);
	});

	it("отменённые позиции не отмечают: их не делают", () => {
		const items = [
			item("пациент-А", "Лечение кариеса 26"),
			item("пациент-А", "Отменённая коронка", "cancelled"),
		];
		assert.deepEqual(
			visitOwnedPlanItems(items, "пациент-А").map(
				(entry) => entry.snapshotServiceName,
			),
			["Лечение кариеса 26"],
		);
	});

	it("отсутствующий или неожиданный ответ сервера не роняет список", () => {
		assert.deepEqual(visitOwnedPlanItems(undefined, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems(null, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems("план", "пациент-А"), []);
		assert.deepEqual(
			visitOwnedPlanItems([null, undefined, {}], "пациент-А"),
			[],
		);
	});
});

/**
 * ДЕНЬГИ. Непрочитанная цена печаталась как «0 ₽»: услуга с неизвестной ценой
 * выглядела бесплатной, и её ноль складывался в итог «К оплате по отмеченному».
 * Врач называл пациенту сумму, в которой не хватало позиций, и отличить это по
 * экрану было нельзя.
 */
describe("цена позиции плана", () => {
	it("рубли читаются из строки, как их отдаёт база", () => {
		// numeric из drizzle приходит СТРОКОЙ с точкой.
		assert.equal(parseRubAmount("1500.50"), 1500.5);
		assert.equal(parseRubAmount("0"), 0);
		assert.equal(parseRubAmount(1500.5), 1500.5);
	});

	it("запятая принимается, разделители тысяч убираются", () => {
		assert.equal(parseRubAmount("1500,50"), 1500.5);
		assert.equal(parseRubAmount("1 500,50"), 1500.5);
		assert.equal(parseRubAmount("1 500.50"), 1500.5);
		assert.equal(parseRubAmount("1 500,50"), 1500.5);
	});

	it("непрочитанная цена возвращает null, а не ноль", () => {
		assert.equal(parseRubAmount(null), null);
		assert.equal(parseRubAmount(undefined), null);
		assert.equal(parseRubAmount(""), null);
		assert.equal(parseRubAmount("   "), null);
		assert.equal(parseRubAmount("бесплатно"), null);
		assert.equal(parseRubAmount("1500 ₽"), null);
		assert.equal(parseRubAmount(Number.NaN), null);
		// Две разные разделительные пары — угадывать в деньгах нельзя.
		assert.equal(parseRubAmount("1,500.50"), null);
		assert.equal(parseRubAmount("1.500,50"), null);
	});

	it("итог строки — цена × количество − скидка, не ниже нуля", () => {
		assert.equal(
			planLineTotalRub({
				unitPriceRub: "1500.50",
				quantity: 2,
				discountRub: "1.00",
			}),
			3000,
		);
		// Количества нет — это одна единица, как и в смете.
		assert.equal(planLineTotalRub({ unitPriceRub: "990" }), 990);
		// Скидка больше цены не превращается в долг пациента.
		assert.equal(
			planLineTotalRub({ unitPriceRub: "500", discountRub: "900" }),
			0,
		);
		// Копейки не уплывают на третий знак.
		assert.equal(
			planLineTotalRub({ unitPriceRub: "0.505", quantity: 1 }),
			0.51,
		);
	});

	it("итог не выдумывается там, где цену прочитать нельзя", () => {
		assert.equal(planLineTotalRub({ quantity: 1 }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: null }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: "договорная" }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: "1500", quantity: 0 }), null);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", quantity: -2 }),
			null,
		);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", quantity: "две" }),
			null,
		);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", discountRub: "скидка" }),
			null,
		);
		assert.equal(planLineTotalRub(null), null);
	});

	it("количество: пусто — одна единица, ноль и мусор — не количество", () => {
		assert.equal(planLineQuantity({}), 1);
		assert.equal(planLineQuantity({ quantity: null }), 1);
		assert.equal(planLineQuantity({ quantity: "" }), 1);
		assert.equal(planLineQuantity({ quantity: 3 }), 3);
		assert.equal(planLineQuantity({ quantity: "3" }), 3);
		assert.equal(planLineQuantity({ quantity: 0 }), null);
		assert.equal(planLineQuantity({ quantity: "две" }), null);
	});
});
