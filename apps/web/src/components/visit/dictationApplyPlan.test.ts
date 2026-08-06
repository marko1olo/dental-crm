import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DICTATION_NOTHING_TO_APPLY_NOTE,
	dictationAppliedNote,
	dictationEmkEntries,
	dictationToothUpdates,
} from "./dictationApplyPlan";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Кнопка «Применить» в предпросмотре разбора диктовки
 * закрывала окно всегда — в том числе когда местный разбор не справился и вместо
 * данных отдал заготовку запроса к ИИ (`{ isAiTask, prompt }`). Врач диктовал
 * осмотр, жал «Применить», окно исчезало, и приём считался записанным: в карте
 * не появлялось ни одной буквы. Здесь проверяется, что разбор без данных
 * распознаётся как «переносить нечего», а расписка о переносе не врёт.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/dictationApplyPlan.test.ts
 */

describe("разбор диктовки: что реально уходит в карту приёма", () => {
	it("заготовка запроса к ИИ — это не данные: переносить нечего", () => {
		const aiTask = { isAiTask: true, prompt: "Структурируй приём: ..." };

		assert.deepEqual(dictationToothUpdates(aiTask), []);
		assert.deepEqual(dictationEmkEntries(aiTask), []);
		// Врач обязан узнать, что текст остался в поле диктовки, а не в карте.
		assert.match(DICTATION_NOTHING_TO_APPLY_NOTE, /Переносить нечего/);
		assert.match(DICTATION_NOTHING_TO_APPLY_NOTE, /остался в поле выше/);
	});

	it("пустой разбор и мусор вместо разбора не считаются переносом", () => {
		assert.deepEqual(
			dictationToothUpdates({ toothUpdates: [], emkUpdates: {} }),
			[],
		);
		assert.deepEqual(
			dictationEmkEntries({ toothUpdates: [], emkUpdates: {} }),
			[],
		);
		assert.deepEqual(dictationToothUpdates(null), []);
		assert.deepEqual(dictationEmkEntries(null), []);
		assert.deepEqual(dictationToothUpdates({ toothUpdates: "26" }), []);
		assert.deepEqual(dictationEmkEntries({ emkUpdates: "жалобы" }), []);
	});

	it("пробелы и пустые строки в полях ЭМК отбрасываются", () => {
		const entries = dictationEmkEntries({
			emkUpdates: {
				complaint: "Боль при накусывании.",
				anamnesis: "   ",
				diagnosis: "",
				treatmentPlan: null,
			},
		});

		assert.deepEqual(entries, [["complaint", "Боль при накусывании."]]);
	});

	it("отметка зуба без кода отбрасывается: писать её некуда", () => {
		const teeth = dictationToothUpdates({
			toothUpdates: [
				{ code: "26", state: "filled" },
				{ code: "", state: "filled" },
				{ state: "filled" },
				null,
			],
		});

		assert.deepEqual(teeth, [{ code: "26", state: "filled" }]);
	});

	it("расписка о переносе называет поля по-человечески и склоняет зубы", () => {
		assert.equal(
			dictationAppliedNote(["complaint", "diagnosis"], 1),
			"Перенесено в карту приёма: жалобы, диагноз; 1 зуб. Проверьте текст в полях карты.",
		);
		assert.match(dictationAppliedNote([], 2), /2 зуба/);
		assert.match(dictationAppliedNote([], 5), /5 зубов/);
		assert.match(dictationAppliedNote([], 11), /11 зубов/);
		// Только поля, без зубов — лишней точки с запятой в расписке быть не должно.
		assert.equal(
			dictationAppliedNote(["objectiveStatus"], 0),
			"Перенесено в карту приёма: осмотр. Проверьте текст в полях карты.",
		);
	});
});
