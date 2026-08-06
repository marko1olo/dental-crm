import assert from "node:assert";
import { describe, it } from "node:test";
import { parseVisitDictationLocal } from "./smartVisitParser";

/**
 * Разбор диктовки приёма — живой путь: его вызывает
 * AiOrchestrator.processEmkDictation, то есть кнопка диктовки в ЭМК.
 *
 * До этих тестов проверок у парсера не было вовсе. В apps/web/tests лежал
 * файл smartParsers.test.ts, который только печатал результат в консоль:
 * ни одного утверждения, и каталог не попадал ни под один шаблон запуска
 * тестов. То есть разбор диктовки не проверялся ничем.
 */
describe("parseVisitDictationLocal", () => {
	it("жалоба не теряется, когда врач диктует «жалуется на»", () => {
		const result = parseVisitDictationLocal(
			"Иванов пришел, жалуется на выпавшую пломбу. 11 зуб кариес, поставил коффердам и сделал.",
		);
		// Раньше здесь не было complaint вовсе: раздел открывался только по
		// слову «жалобы», а «жалуется» пропускалось, и текст выбрасывался.
		assert.ok(result.emkUpdates.complaint, "жалоба не попала в ЭМК");
		assert.match(String(result.emkUpdates.complaint), /выпавшую пломбу/i);
	});

	it("жалоба по существительному разбирается как раньше", () => {
		const result = parseVisitDictationLocal("жалобы на боли при накусывании.");
		assert.equal(result.emkUpdates.complaint, "Боли при накусывании.");
	});

	it("диктовка о вмешательстве не пропадает целиком", () => {
		const result = parseVisitDictationLocal(
			"удалил 38 зуб. экстракция прошла успешно. анестезия",
		);
		// Раньше emkUpdates был пустым объектом: менялось только состояние
		// зуба, а запись о самом лечении не сохранялась нигде.
		assert.ok(
			result.emkUpdates.treatmentPlan,
			"запись о лечении не сохранилась",
		);
		assert.match(String(result.emkUpdates.treatmentPlan), /экстракц/i);
		assert.match(String(result.emkUpdates.treatmentPlan), /анестез/i);
	});

	it("удаление помечает зуб отсутствующим", () => {
		const result = parseVisitDictationLocal(
			"удалил 38 зуб. экстракция прошла успешно.",
		);
		assert.deepEqual(result.toothUpdates, [{ code: "38", state: "missing" }]);
	});

	it("имплант помечает зуб как имплантацию", () => {
		const result = parseVisitDictationLocal(
			"пациент хочет имплант на место 24. хирург",
		);
		assert.deepEqual(result.toothUpdates, [{ code: "24", state: "implant" }]);
	});

	it("кариес и пульпит ведут к состоянию лечения", () => {
		assert.deepEqual(parseVisitDictationLocal("11 зуб кариес").toothUpdates, [
			{ code: "11", state: "treatment" },
		]);
		assert.deepEqual(parseVisitDictationLocal("36 зуб пульпит").toothUpdates, [
			{ code: "36", state: "treatment" },
		]);
	});

	it("коронка ведёт к ортопедии", () => {
		assert.deepEqual(parseVisitDictationLocal("на 26 коронка").toothUpdates, [
			{ code: "26", state: "prosthetics" },
		]);
	});

	it("один и тот же зуб не дублируется в пределах фразы", () => {
		const result = parseVisitDictationLocal("36 зуб кариес, лечим 36 зуб");
		const codes = result.toothUpdates.map((t) => t.code);
		assert.deepEqual(
			[...new Set(codes)],
			codes,
			`зубы задвоились: ${codes.join(", ")}`,
		);
	});

	it("пустая строка не приводит к исключению и ничего не выдумывает", () => {
		const result = parseVisitDictationLocal("");
		assert.deepEqual(result.toothUpdates, []);
		assert.deepEqual(result.emkUpdates, {});
	});

	it("текст без опознаваемых слов не заполняет поля наугад", () => {
		const result = parseVisitDictationLocal("здравствуйте проходите садитесь");
		assert.deepEqual(result.emkUpdates, {});
	});

	/**
	 * Известное ограничение, зафиксированное намеренно, а не исправленное.
	 *
	 * Открытый явным словом раздел удерживает текст до следующего явного
	 * слова: мягкие переключатели («кариес», «рентген») внутри активного
	 * раздела не срабатывают. Поэтому во фразе «жалобы на ... 45 зуб
	 * периодонтит» диагноз остаётся внутри жалобы.
	 *
	 * Менять это правило вслепую нельзя: фраза «жалуется на кариес» —
	 * законная жалоба, и переключение на диагноз по слову «кариес» испортило
	 * бы её. Разделение требует отдельной работы над разбором, а тест
	 * фиксирует нынешнее поведение, чтобы изменение было замечено.
	 */
	it("ограничение: явный раздел удерживает текст до следующего явного слова", () => {
		const result = parseVisitDictationLocal(
			"жалобы на боли при накусывании. 45 зуб периодонтит.",
		);
		assert.match(String(result.emkUpdates.complaint), /периодонтит/i);
		assert.equal(result.emkUpdates.diagnosis, undefined);
	});
});
