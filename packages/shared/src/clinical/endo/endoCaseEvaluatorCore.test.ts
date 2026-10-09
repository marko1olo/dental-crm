import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	applyAnatomicalWorkingLengths,
	evaluateEndoCanalObturation,
	evaluateEndoCase,
	getDefaultCanalsForTooth,
	isEndoObturationStarCompliant,
	type EndoCanalData,
} from "./index.js";

describe("endoCaseEvaluatorCore — СтАР Clinical Quality Audit", () => {
	test("Оптимальная обтурация: пломбирование на 0.5–1.5 мм до апекса признается оптимальным и валидным по СтАР", () => {
		const canal: EndoCanalData = {
			id: "c-1",
			canalName: "MB",
			referencePoint: "Щечный бугор",
			workingLengthMm: 19.5, // Анатомическая норма для зуба 36: 20.0 мм, разница 0.5 мм (оптимально)
			masterApicalFile: "ISO 25 (#25 красный)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Латеральная компакция холодной гуттаперчи",
			sealer: "AH Plus",
		};

		const evalResult = evaluateEndoCanalObturation(canal, 36);
		assert.equal(evalResult.lengthStatus, "optimal");
		assert.equal(evalResult.densityStatus, "dense_homogeneous");
		assert.equal(evalResult.isCompliantStar, true);
		assert.ok(evalResult.clinicalNoteRu.includes("Оптимально"));
	});

	test("Недопломбировка: недоход до рентгенологического апекса > 2.0 мм маркируется как underfilled (брак СтАР)", () => {
		const canal: EndoCanalData = {
			id: "c-2",
			canalName: "D",
			referencePoint: "Дистальный бугор",
			workingLengthMm: 17.5, // Анатомическая норма для зуба 36 канал D: 21.0 мм, разница 3.5 мм (> 2.0 мм)
			masterApicalFile: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			sealer: "AH Plus",
		};

		const evalResult = evaluateEndoCanalObturation(canal, 36);
		assert.equal(evalResult.lengthStatus, "underfilled");
		assert.equal(evalResult.isCompliantStar, false);
		assert.ok(evalResult.clinicalNoteRu.includes("Недопломбировка"));
	});

	test("Выведение за апекс: пломбирование длиннее корня маркируется как overfilled с предупреждением", () => {
		const canal: EndoCanalData = {
			id: "c-3",
			canalName: "P",
			referencePoint: "Нёбный бугор",
			workingLengthMm: 23.5, // Анатомическая норма для 16 канал P: 22.0 мм, разница -1.5 мм (выведение)
			masterApicalFile: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Горячая гуттаперча на носителе (GuttaCore)",
			sealer: "AH Plus",
		};

		const evalResult = evaluateEndoCanalObturation(canal, 16);
		assert.equal(evalResult.lengthStatus, "overfilled");
		assert.equal(evalResult.isCompliantStar, false);
		assert.ok(evalResult.clinicalNoteRu.includes("Выведение"));
	});

	test("Временная обтурация гидроксидом кальция (Metapex/Calcept) валидируется как временный лечебный этап", () => {
		const canal: EndoCanalData = {
			id: "c-4",
			canalName: "Main",
			referencePoint: "Режущий край",
			workingLengthMm: 21.5, // Норма для 11: 22.0 мм, разница 0.5 мм
			masterApicalFile: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Временная обтурация Ca(OH)2 (Metapex / Calcept)",
			sealer: "Calcept",
		};

		const evalResult = evaluateEndoCanalObturation(canal, 11);
		assert.equal(evalResult.lengthStatus, "optimal");
		assert.equal(evalResult.densityStatus, "temporary_calcium");
		assert.equal(evalResult.isCompliantStar, true);
	});

	test("Комплексная оценка клинического случая evaluateEndoCase для моляра (16)", () => {
		const defaultCanals = getDefaultCanalsForTooth(16);
		const canals = applyAnatomicalWorkingLengths(defaultCanals, 16);
		const caseResult = evaluateEndoCase({
			toothNumber: 16,
			canals,
		});

		assert.equal(caseResult.toothNumber, 16);
		assert.equal(caseResult.totalCanals, 4);
		assert.equal(caseResult.evaluatedCanals.length, 4);
		assert.equal(caseResult.isFullyCompliantStar, true);
		assert.equal(caseResult.hasOverfill, false);
		assert.equal(caseResult.hasUnderfill, false);
		assert.ok(caseResult.clinicalRecommendationsRu.length >= 2);
	});

	test("isEndoObturationStarCompliant возвращает false при наличии дефектов", () => {
		const defectiveCanals: EndoCanalData[] = [
			{
				id: "def-1",
				canalName: "MB",
				referencePoint: "Щечный бугор",
				workingLengthMm: 15.0, // Сильная недопломбировка для 46 (норма 20.0 мм)
				masterApicalFile: "ISO 25",
				taper: ".06",
				obturationTechnique: "Гуттаперча + Силер",
			},
		];

		assert.equal(
			isEndoObturationStarCompliant({ toothNumber: 46, canals: defectiveCanals }),
			false,
		);
	});
});
