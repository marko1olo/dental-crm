import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PatientCardSavePill,
	type PatientSectionSaveState,
	patientCardSavePill,
} from "../patientCardSavePill.js";

describe("правило плашки сохранения", () => {
	const idle = { dirty: false, saveState: "idle" as PatientSectionSaveState };

	test("без выбранного пациента плашки нет ни в одном состоянии", () => {
		for (const saveState of ["idle", "saving", "saved", "error"] as const) {
			for (const dirty of [false, true]) {
				assert.equal(
					patientCardSavePill({
						hasSelectedPatient: false,
						sections: [{ dirty, saveState }],
					}),
					null,
					`состояние ${saveState}/${dirty ? "изменено" : "чисто"} дало плашку без пациента`,
				);
			}
		}
	});

	test("«Сохранено» только при состоянии saved, а не по умолчанию", () => {
		assert.equal(
			patientCardSavePill({ hasSelectedPatient: true, sections: [idle] }),
			null,
		);
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [{ dirty: false, saveState: "saved" }],
			})?.label,
			"Сохранено",
		);
	});

	test("несохранённая правка перебивает состоявшееся сохранение другого блока", () => {
		const pill = patientCardSavePill({
			hasSelectedPatient: true,
			sections: [
				{ dirty: false, saveState: "saved" },
				{ dirty: true, saveState: "idle" },
			],
		});
		assert.equal(pill?.label, "Не сохранено");
		assert.equal(pill?.tone, "dirty");
	});

	test("незакрытая ошибка не прячется за надписью о ходе сохранения", () => {
		const pill = patientCardSavePill({
			hasSelectedPatient: true,
			sections: [
				{ dirty: false, saveState: "saving" },
				{ dirty: false, saveState: "error" },
			],
		});
		assert.equal(pill?.label, "Ошибка");
	});

	test("отказ валидации до запроса — тоже ошибка, а не «нет изменений»", () => {
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [
					{
						dirty: false,
						saveState: "idle",
						validationMessage: "Укажите конец удобного времени приема или очистите начало.",
					},
				],
			})?.label,
			"Ошибка",
		);
		assert.equal(
			patientCardSavePill({
				hasSelectedPatient: true,
				sections: [{ dirty: false, saveState: "idle", validationMessage: "" }],
			}),
			null,
		);
	});

	test("каждое состояние красится своим классом, и ни одно — словарём статусов приёма", () => {
		const rendered = [
			{ dirty: false, saveState: "saving" as PatientSectionSaveState, expect: "save-pill-saving" },
			{ dirty: true, saveState: "idle" as PatientSectionSaveState, expect: "save-pill-dirty" },
			{ dirty: false, saveState: "error" as PatientSectionSaveState, expect: "save-pill-error" },
			{ dirty: false, saveState: "saved" as PatientSectionSaveState, expect: "save-pill-saved" },
		];
		for (const state of rendered) {
			const markup = renderToStaticMarkup(
				createElement(PatientCardSavePill, {
					hasSelectedPatient: true,
					sections: [{ dirty: state.dirty, saveState: state.saveState }],
				}),
			);
			assert.ok(markup.includes(state.expect), `${state.expect} не отрисован: ${markup}`);
			assert.ok(!markup.includes("status-"), `плашка тянет чужой словарь: ${markup}`);
			assert.match(markup, /title="[^"]{20,}"/);
		}
	});
});
