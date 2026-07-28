import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NIL_UUID, imagingWriteTarget, realVisitFieldId } from "./visitIdentity";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Вкладка «Рентгены и Диагностика» экрана «Приём» пишет
 * снимок, заключение и найденные ИИ состояния зубов в карту
 * patientStore.selectedPatientId — то есть того пациента, что открыт в разделе
 * «Пациенты», а не того, у кого идёт приём. Врач, заглянувший перед приёмом в
 * чужую карточку, кладёт снимок пациента приёма в чужую карту, и заметить это на
 * экране было нечем.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/visitIdentity.test.ts
 */

describe("идентификатор приёма", () => {
	it("читается без мусора", () => {
		assert.equal(realVisitFieldId("  приём-1  "), "приём-1");
		assert.equal(realVisitFieldId(NIL_UUID), null);
		assert.equal(realVisitFieldId(""), null);
		assert.equal(realVisitFieldId("   "), null);
		assert.equal(realVisitFieldId(undefined), null);
		assert.equal(realVisitFieldId(null), null);
		assert.equal(realVisitFieldId(42), null);
	});
});

describe("в чью карту ляжет снимок", () => {
	it("выбран пациент приёма — запись идёт туда, куда врач думает", () => {
		assert.equal(imagingWriteTarget("пациент-А", "пациент-А"), "visit-patient");
		assert.equal(imagingWriteTarget(" пациент-А ", "пациент-А"), "visit-patient");
	});

	it("выбран другой пациент — снимок уйдёт в чужую карту", () => {
		assert.equal(imagingWriteTarget("пациент-Б", "пациент-А"), "another-patient");
	});

	it("пациент не выбран — разбор будет, записи в карту не будет", () => {
		assert.equal(imagingWriteTarget(null, "пациент-А"), "nobody");
		assert.equal(imagingWriteTarget("", "пациент-А"), "nobody");
		assert.equal(imagingWriteTarget("   ", "пациент-А"), "nobody");
	});

	it("приём не открыт — сравнивать не с кем", () => {
		assert.equal(imagingWriteTarget("пациент-Б", null), "no-visit");
		// Заготовка приёма с нулевым UUID приёмом не считается.
		assert.equal(imagingWriteTarget("пациент-Б", NIL_UUID), "no-visit");
		assert.equal(imagingWriteTarget(null, null), "no-visit");
	});
});
