import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	parseDoctorVoiceDictation,
	extractProcedures,
	extractMaterials,
} from "./voiceDictationParser.js";

describe("voiceDictationParser: Clinical Speech & Procedure Extraction", () => {
	it("extracts procedures, teeth, diagnoses, anesthesia and materials from therapy dictation", () => {
		const dictation =
			"Зуб 36, глубокий кариес дентина. Проведена инфильтрационная анестезия убистезин 1.7 мл. Изоляция коффердам. Препарирование полости, медикаментозная обработка, постановка световой пломбы Filtek Ultimate, полировка.";

		const parsed = parseDoctorVoiceDictation(dictation);

		assert.deepStrictEqual(parsed.teeth, [36]);
		assert.ok(parsed.diagnoses.length > 0);
		assert.strictEqual(parsed.diagnoses[0]?.code, "K02.1");
		assert.ok(parsed.anesthesia?.drug?.includes("Убистезин"));
		assert.strictEqual(parsed.anesthesia?.volumeMl, 1.7);

		// Verified procedures extraction (Mandate 8e/8z)
		assert.ok(parsed.procedures.length >= 3, `Expected at least 3 procedures, got ${parsed.procedures.length}`);
		assert.ok(parsed.procedures.some((p) => p.includes("Препарирование")));
		assert.ok(parsed.procedures.some((p) => p.includes("коффердам")));
		assert.ok(parsed.procedures.some((p) => p.includes("светоотверждаемым композитом")));
		assert.ok(parsed.procedures.some((p) => p.includes("Шлифовка и полировка")));

		// Verified materials
		assert.ok(parsed.materials.some((m) => m.includes("Коффердам")));
		assert.ok(parsed.materials.some((m) => m.includes("Filtek Ultimate")));
	});

	it("extracts endodontic procedures (canal preparation and obturation)", () => {
		const dictation =
			"Зуб 26, острый пульпит. Анестезия септонест 1 карпула. Наложен раббердам. Мехобработка каналов машинными файлами ProTaper, промывание гипохлоритом 3%, обтурация каналов гуттаперчей и AH Plus.";

		const parsed = parseDoctorVoiceDictation(dictation);

		assert.deepStrictEqual(parsed.teeth, [26]);
		assert.ok(parsed.diagnoses.some((d) => d.code === "K04.0"));
		assert.ok(parsed.procedures.some((p) => p.includes("обработка корневых каналов")));
		assert.ok(parsed.procedures.some((p) => p.includes("Обтурация корневых каналов")));
		assert.ok(parsed.materials.some((m) => m.includes("AH Plus")));
		assert.ok(parsed.materials.some((m) => m.includes("Гуттаперча")));
	});

	it("extracts surgery procedures (extraction and sutures)", () => {
		const dictation =
			"Зуб 48 дистопированный, перикоронит. Проводниковая анестезия. Сложное удаление зуба элеватором, кюретаж лунки, гемостаз альвостаз, наложение швов викрил 4-0.";

		const parsed = parseDoctorVoiceDictation(dictation);

		assert.deepStrictEqual(parsed.teeth, [48]);
		assert.ok(parsed.procedures.some((p) => p.includes("Удаление зуба")));
		assert.ok(parsed.procedures.some((p) => p.includes("Наложение швов")));
		assert.ok(parsed.materials.some((m) => m.includes("Альвостаз")));
		assert.ok(parsed.materials.some((m) => m.includes("Vicryl") || m.includes("Шовный")));
	});

	it("extracts hygiene procedures (Air-Flow and ultrasonic scaling)", () => {
		const dictation =
			"Проведена комплексная профессиональная гигиена полости рта: снятие зубных отложений ультразвуком, обработка аппаратом Air-Flow, полировка пастой.";

		const parsed = parseDoctorVoiceDictation(dictation);

		assert.ok(parsed.procedures.some((p) => p.includes("Профессиональная гигиена")));
		assert.ok(parsed.procedures.some((p) => p.includes("Шлифовка и полировка")));
	});
});
