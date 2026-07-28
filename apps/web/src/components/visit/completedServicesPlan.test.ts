import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { visitOwnedPlanItems } from "./completedServicesPlan";
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
			visitOwnedPlanItems(items, "пациент-Б").map((entry) => entry.snapshotServiceName),
			["Удаление 48", "Имплантация 46"],
		);
	});

	it("без пациента открытого приёма отмечать нечего", () => {
		const items = [item("пациент-А", "Лечение кариеса 26")];
		assert.deepEqual(visitOwnedPlanItems(items, null), []);
		// Заготовка приёма из гидратации базы приёмом не считается.
		assert.deepEqual(visitOwnedPlanItems(items, realVisitFieldId(NIL_UUID)), []);
		assert.deepEqual(visitOwnedPlanItems(items, realVisitFieldId("   ")), []);
	});

	it("отменённые позиции не отмечают: их не делают", () => {
		const items = [
			item("пациент-А", "Лечение кариеса 26"),
			item("пациент-А", "Отменённая коронка", "cancelled"),
		];
		assert.deepEqual(
			visitOwnedPlanItems(items, "пациент-А").map((entry) => entry.snapshotServiceName),
			["Лечение кариеса 26"],
		);
	});

	it("отсутствующий или неожиданный ответ сервера не роняет список", () => {
		assert.deepEqual(visitOwnedPlanItems(undefined, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems(null, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems("план", "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems([null, undefined, {}], "пациент-А"), []);
	});

});
