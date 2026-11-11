import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { AnatomicalSurfaceKey } from "../anatomicalGeometriesTypes";
import {
	ANATOMICAL_SURFACE_LABELS_RU,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	isMaxillaryArch,
	isPatientLeftSide,
	isSurfaceActive,
	normalizeAnatomicalSurfaces,
	normalizeSurfaceKey,
} from "../anatomicalMaterialsAndSurfaces";
import {
	MIXED_LOWER_TEETH,
	MIXED_UPPER_TEETH,
	PEDIATRIC_LOWER_TEETH,
	PEDIATRIC_UPPER_TEETH,
} from "../anatomicalPediatricGeometries";
import { BOTTOM_TEETH, TOP_TEETH } from "../AnatomicalToothColors";
import { AnatomicalTooth } from "../gate0/AnatomicalTooth";

describe("Anatomical Adult & Pediatric Teeth Morphology Suite (Wheeler 2.5D SSOT)", () => {
	test("Все 32 постоянных зуба взрослого человека рендерятся каноническим AnatomicalTooth", () => {
		const allAdultTeeth = [...TOP_TEETH, ...BOTTOM_TEETH];
		assert.equal(allAdultTeeth.length, 32, "Должно быть ровно 32 постоянных зуба");

		for (const toothNum of allAdultTeeth) {
			const html = renderToString(React.createElement(AnatomicalTooth, { toothNumber: toothNum }));
			assert.ok(html.includes("<svg"), `Зуб ${toothNum} должен рендерить SVG`);
			assert.ok(html.includes("viewBox=\"0 0 100"), `Зуб ${toothNum} должен иметь канонический viewBox 100`);
			assert.ok(html.includes(`>${toothNum}<`), `Зуб ${toothNum} должен отображать бейдж номера FDI`);
		}
	});

	test("Все 20 молочных зубов ребенка рендерятся каноническим AnatomicalTooth", () => {
		const allPediatricTeeth = [...PEDIATRIC_UPPER_TEETH, ...PEDIATRIC_LOWER_TEETH];
		assert.equal(allPediatricTeeth.length, 20, "Должно быть ровно 20 молочных зубов");

		for (const toothNum of allPediatricTeeth) {
			const html = renderToString(React.createElement(AnatomicalTooth, { toothNumber: toothNum }));
			assert.ok(html.includes("<svg"), `Молочный зуб ${toothNum} должен рендерить SVG`);
			assert.ok(html.includes(`>${toothNum}<`), `Молочный зуб ${toothNum} должен отображать бейдж номера FDI`);
		}
	});

	test("Сменный прикус (Mixed Dentition) корректно объединяет постоянные моляры и молочные зубы", () => {
		assert.equal(MIXED_UPPER_TEETH.length, 12);
		assert.equal(MIXED_LOWER_TEETH.length, 12);
		assert.ok(MIXED_UPPER_TEETH.includes(16) && MIXED_UPPER_TEETH.includes(26));
		assert.ok(MIXED_UPPER_TEETH.includes(55) && MIXED_UPPER_TEETH.includes(65));
		assert.ok(MIXED_LOWER_TEETH.includes(46) && MIXED_LOWER_TEETH.includes(36));
		assert.ok(MIXED_LOWER_TEETH.includes(85) && MIXED_LOWER_TEETH.includes(75));
	});

	test("Сагиттальная симметрия (Q2/Q3 scale(-1, 1)) и сохранение читаемости номера зуба", () => {
		const html26 = renderToString(React.createElement(AnatomicalTooth, { toothNumber: 26 }));
		assert.ok(html26.includes("scale(-1, 1)"));
		assert.ok(html26.includes(">26<"));
		const html16 = renderToString(React.createElement(AnatomicalTooth, { toothNumber: 16 }));
		assert.ok(!html16.includes("scale(-1, 1)"));
		assert.ok(html16.includes(">16<"));
	});

	test("Расчет геометрических путей резорбции пародонтальной кости (Periodontal Bone Loss)", () => {
		// Верхняя челюсть: потеря кости 50%
		const upperBone = getPeriodontalBoneLevelPath(16, 50, "horizontal");
		assert.ok(upperBone.boneLine.startsWith("M"));
		assert.ok(upperBone.resorptionArea.startsWith("M"));
		assert.ok(upperBone.resorptionArea.endsWith("Z"));

		// Нижняя челюсть: вертикальный дефект 40%
		const lowerBone = getPeriodontalBoneLevelPath(46, 40, "vertical");
		assert.ok(lowerBone.boneLine.startsWith("M"));
		assert.ok(lowerBone.resorptionArea.startsWith("M"));
		assert.ok(lowerBone.resorptionArea.endsWith("Z"));

		// Нулевая потеря кости: пустые пути
		const zeroBone = getPeriodontalBoneLevelPath(11, 0, "none");
		assert.equal(zeroBone.boneLine, "");
		assert.equal(zeroBone.resorptionArea, "");
	});

	test("Расчет контура десневой рецессии (Gingival Recession)", () => {
		// Верхняя челюсть: рецессия 3 мм
		const upperRecession = getGingivalRecessionPath(11, 3);
		assert.ok(upperRecession.startsWith("M"));

		// Нижняя челюсть: рецессия 4 мм
		const lowerRecession = getGingivalRecessionPath(31, 4);
		assert.ok(lowerRecession.startsWith("M"));

		// Нулевая рецессия
		const zeroRecession = getGingivalRecessionPath(21, 0);
		assert.equal(zeroRecession, "");
	});

	test("Челюстная и сторонная ориентация зубов (Arch & Side orientation)", () => {
		// Верхняя челюсть: Q1, Q2, Q5, Q6
		assert.equal(isMaxillaryArch(16), true);
		assert.equal(isMaxillaryArch(21), true);
		assert.equal(isMaxillaryArch(55), true);
		assert.equal(isMaxillaryArch(63), true);

		// Нижняя челюсть: Q3, Q4, Q7, Q8
		assert.equal(isMaxillaryArch(36), false);
		assert.equal(isMaxillaryArch(41), false);
		assert.equal(isMaxillaryArch(75), false);
		assert.equal(isMaxillaryArch(82), false);

		// Левая сторона пациента (Quadrant 2, 3, 6, 7)
		assert.equal(isPatientLeftSide(26), true);
		assert.equal(isPatientLeftSide(36), true);
		assert.equal(isPatientLeftSide(65), true);
		assert.equal(isPatientLeftSide(75), true);

		// Правая сторона пациента (Quadrant 1, 4, 5, 8)
		assert.equal(isPatientLeftSide(16), false);
		assert.equal(isPatientLeftSide(46), false);
		assert.equal(isPatientLeftSide(55), false);
		assert.equal(isPatientLeftSide(85), false);
	});

	test("Клинический справочник поверхностей ANATOMICAL_SURFACE_LABELS_RU содержит все 6 анатомических зон", () => {
		const surfaces: AnatomicalSurfaceKey[] = ["O", "V", "L", "M", "D", "C"];
		for (const s of surfaces) {
			const info = ANATOMICAL_SURFACE_LABELS_RU[s];
			assert.ok(info, `Поверхность ${s} должна быть зарегистрирована в словаре`);
			assert.ok(info.nameRu.length > 5, `Название поверхности ${s} должно быть полным`);
			assert.ok(info.shortRu.length > 1, `Краткое обозначение поверхности ${s} должно быть задано`);
			assert.ok(info.descriptionRu.length > 10, `Клиническое описание поверхности ${s} должно содержать подробности`);
		}
	});

	test("normalizeSurfaceKey корректно нормализует международные и русскоязычные обозначения поверхностей", () => {
		// Окклюзионная / режущая
		assert.equal(normalizeSurfaceKey("O"), "O");
		assert.equal(normalizeSurfaceKey("Occ"), "O");
		assert.equal(normalizeSurfaceKey("Occlusal"), "O");
		assert.equal(normalizeSurfaceKey("I"), "O");
		assert.equal(normalizeSurfaceKey("Incisal"), "O");
		assert.equal(normalizeSurfaceKey("О"), "O");
		assert.equal(normalizeSurfaceKey("оккл"), "O");
		assert.equal(normalizeSurfaceKey("Режущий"), "O");

		// Вестибулярная / щечная
		assert.equal(normalizeSurfaceKey("V"), "V");
		assert.equal(normalizeSurfaceKey("B"), "V");
		assert.equal(normalizeSurfaceKey("buccal"), "V");
		assert.equal(normalizeSurfaceKey("vestibular"), "V");
		assert.equal(normalizeSurfaceKey("В"), "V");
		assert.equal(normalizeSurfaceKey("Щ"), "V");
		assert.equal(normalizeSurfaceKey("вест"), "V");
		assert.equal(normalizeSurfaceKey("щечная"), "V");

		// Язычная / нёбная
		assert.equal(normalizeSurfaceKey("L"), "L");
		assert.equal(normalizeSurfaceKey("P"), "L");
		assert.equal(normalizeSurfaceKey("lingual"), "L");
		assert.equal(normalizeSurfaceKey("palatal"), "L");
		assert.equal(normalizeSurfaceKey("Я"), "L");
		assert.equal(normalizeSurfaceKey("Н"), "L");
		assert.equal(normalizeSurfaceKey("яз"), "L");
		assert.equal(normalizeSurfaceKey("нёбная"), "L");

		// Медиальная / мезиальная
		assert.equal(normalizeSurfaceKey("M"), "M");
		assert.equal(normalizeSurfaceKey("mesial"), "M");
		assert.equal(normalizeSurfaceKey("М"), "M");
		assert.equal(normalizeSurfaceKey("мед"), "M");
		assert.equal(normalizeSurfaceKey("мезиальная"), "M");

		// Дистальная
		assert.equal(normalizeSurfaceKey("D"), "D");
		assert.equal(normalizeSurfaceKey("distal"), "D");
		assert.equal(normalizeSurfaceKey("Д"), "D");
		assert.equal(normalizeSurfaceKey("дист"), "D");
		assert.equal(normalizeSurfaceKey("дистальная"), "D");

		// Пришеечная (цервикальная)
		assert.equal(normalizeSurfaceKey("C"), "C");
		assert.equal(normalizeSurfaceKey("cervical"), "C");
		assert.equal(normalizeSurfaceKey("П"), "C");
		assert.equal(normalizeSurfaceKey("приш"), "C");
		assert.equal(normalizeSurfaceKey("церв"), "C");
		assert.equal(normalizeSurfaceKey("пришеечная"), "C");

		// Неизвестный ключ
		assert.equal(normalizeSurfaceKey("UNKNOWN_SURFACE"), null);
	});

	test("isSurfaceActive точно определяет активность поверхностей при любых клинических алиасах", () => {
		const activeSurfaces = ["M", "O", "C"];
		assert.equal(isSurfaceActive("M", activeSurfaces), true);
		assert.equal(isSurfaceActive("O", activeSurfaces), true);
		assert.equal(isSurfaceActive("C", activeSurfaces), true);
		assert.equal(isSurfaceActive("D", activeSurfaces), false);
		assert.equal(isSurfaceActive("V", activeSurfaces), false);
		assert.equal(isSurfaceActive("L", activeSurfaces), false);

		// Проверка алиасов
		assert.equal(isSurfaceActive("V", ["B"]), true);
		assert.equal(isSurfaceActive("L", ["P"]), true);
		assert.equal(isSurfaceActive("L", ["palatal"]), true);
		assert.equal(isSurfaceActive("O", ["Occ"]), true);
		assert.equal(isSurfaceActive("C", ["Приш"]), true);

		// Пустой или undefined список
		assert.equal(isSurfaceActive("O", []), false);
		assert.equal(isSurfaceActive("O", undefined), false);
	});

	test("normalizeAnatomicalSurfaces корректно преобразует MOD / MO / DO / Class V и списки поверхностей", () => {
		// 1. Составные строковые аббревиатуры
		const modSurfaces = normalizeAnatomicalSurfaces("MOD");
		assert.ok(modSurfaces.includes("M"));
		assert.ok(modSurfaces.includes("O"));
		assert.ok(modSurfaces.includes("D"));
		assert.equal(modSurfaces.length, 3);

		const moSurfaces = normalizeAnatomicalSurfaces("MO");
		assert.ok(moSurfaces.includes("M"));
		assert.ok(moSurfaces.includes("O"));
		assert.equal(moSurfaces.length, 2);

		const doSurfaces = normalizeAnatomicalSurfaces("DO");
		assert.ok(doSurfaces.includes("D"));
		assert.ok(doSurfaces.includes("O"));
		assert.equal(doSurfaces.length, 2);

		const classVSurfaces = normalizeAnatomicalSurfaces("Class V");
		assert.ok(classVSurfaces.includes("C"));
		assert.equal(classVSurfaces.length, 1);

		const classVAlt = normalizeAnatomicalSurfaces("Class_V");
		assert.ok(classVAlt.includes("C"));

		const cervicalSurfaces = normalizeAnatomicalSurfaces("Cervical");
		assert.ok(cervicalSurfaces.includes("C"));

		// 2. Массивы отдельных символов и алиасов
		const mixedArray = normalizeAnatomicalSurfaces(["M", "O", "B", "P", "C"]);
		assert.ok(mixedArray.includes("M"));
		assert.ok(mixedArray.includes("O"));
		assert.ok(mixedArray.includes("V")); // B -> V
		assert.ok(mixedArray.includes("L")); // P -> L
		assert.ok(mixedArray.includes("C"));

		// 3. Кириллическая запись
		const cyrillicMod = normalizeAnatomicalSurfaces("МОД");
		assert.ok(cyrillicMod.includes("M"));
		assert.ok(cyrillicMod.includes("O"));
		assert.ok(cyrillicMod.includes("D"));

		// 4. Пустые значения
		assert.deepEqual(normalizeAnatomicalSurfaces([]), []);
		assert.deepEqual(normalizeAnatomicalSurfaces(null), []);
		assert.deepEqual(normalizeAnatomicalSurfaces(undefined), []);
	});

	test("isSurfaceActive с составными аббревиатурами MOD, MO, DO, Class V", () => {
		// MOD активен для M, O, D, но не для V, L, C
		assert.equal(isSurfaceActive("M", ["MOD"]), true);
		assert.equal(isSurfaceActive("O", ["MOD"]), true);
		assert.equal(isSurfaceActive("D", ["MOD"]), true);
		assert.equal(isSurfaceActive("V", ["MOD"]), false);
		assert.equal(isSurfaceActive("L", ["MOD"]), false);
		assert.equal(isSurfaceActive("C", ["MOD"]), false);

		// MO активен для M и O
		assert.equal(isSurfaceActive("M", ["MO"]), true);
		assert.equal(isSurfaceActive("O", ["MO"]), true);
		assert.equal(isSurfaceActive("D", ["MO"]), false);

		// DO активен для D и O
		assert.equal(isSurfaceActive("D", ["DO"]), true);
		assert.equal(isSurfaceActive("O", ["DO"]), true);
		assert.equal(isSurfaceActive("M", ["DO"]), false);

		// Class V активен для C
		assert.equal(isSurfaceActive("C", ["Class V"]), true);
		assert.equal(isSurfaceActive("O", ["Class V"]), false);
		assert.equal(isSurfaceActive("M", ["Class V"]), false);
	});
});
