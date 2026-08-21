import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ADULT_LOWER_TEETH,
	ADULT_UPPER_TEETH,
	CANAL_OBTURATIONS,
	getAnatomicalGroup,
	getAnatomicalToothGeometry,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ICDAS_CLASSIFICATIONS,
	type IcdasCode,
	isMaxillaryArch,
	isPatientLeftSide,
	MIXED_LOWER_TEETH,
	MIXED_UPPER_TEETH,
	PEDIATRIC_LOWER_TEETH,
	PEDIATRIC_UPPER_TEETH,
	RESTORATIVE_MATERIALS,
} from "../anatomicalToothGeometries";

describe("Anatomical Tooth Geometries & SVG Morphology Suite", () => {
	test("Все 32 постоянных зуба взрослого человека имеют полную анатомическую модель", () => {
		const allAdultTeeth = [...ADULT_UPPER_TEETH, ...ADULT_LOWER_TEETH];
		assert.equal(allAdultTeeth.length, 32, "Должно быть ровно 32 постоянных зуба");

		for (const toothNum of allAdultTeeth) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.fdiNumber, toothNum);
			assert.equal(geom.isPediatric, false, `Зуб ${toothNum} является постоянным`);
			assert.ok(geom.crownPath.length > 10, `Зуб ${toothNum} должен иметь SVG контур коронки`);
			assert.ok(geom.rootPath.length > 10, `Зуб ${toothNum} должен иметь SVG контур корня`);
			assert.ok(geom.cejPath.length > 5, `Зуб ${toothNum} должен иметь границу эмаль-цемент (CEJ)`);
			assert.ok(geom.touchTargetMinPx >= 44, `Touch-target зуба ${toothNum} обязан быть >= 44px`);

			// Проверка 5 поверхностей
			assert.ok(geom.surfaces.O, `Зуб ${toothNum} обязан иметь окклюзионную/режущую поверхность (O)`);
			assert.ok(geom.surfaces.V, `Зуб ${toothNum} обязан иметь вестибулярную поверхность (V)`);
			assert.ok(geom.surfaces.L, `Зуб ${toothNum} обязан иметь язычную/нёбную поверхность (L)`);
			assert.ok(geom.surfaces.M, `Зуб ${toothNum} обязан иметь медиальную поверхность (M)`);
			assert.ok(geom.surfaces.D, `Зуб ${toothNum} обязан иметь дистальную поверхность (D)`);

			// Проверка корневых каналов и апексов
			assert.ok(geom.canals.length >= 1, `Зуб ${toothNum} должен иметь как минимум 1 корневой канал`);
			for (const canal of geom.canals) {
				assert.ok(canal.id, "Канал должен иметь идентификатор");
				assert.ok(canal.nameRu, "Канал должен иметь русское название");
				assert.ok(canal.path.startsWith("M"), "Путь канала должен быть валидным SVG");
				assert.ok(canal.apex.x > 0 && canal.apex.y > 0, "Координаты апекса должны быть положительными");
				assert.ok(canal.defaultLengthMm >= 15.0, "Рабочая длина канала должна быть реалистичной (>= 15мм)");
			}
		}
	});

	test("Все 20 молочных зубов ребенка имеют полную анатомическую модель", () => {
		const allPediatricTeeth = [...PEDIATRIC_UPPER_TEETH, ...PEDIATRIC_LOWER_TEETH];
		assert.equal(allPediatricTeeth.length, 20, "Должно быть ровно 20 молочных зубов");

		for (const toothNum of allPediatricTeeth) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.fdiNumber, toothNum);
			assert.equal(geom.isPediatric, true, `Зуб ${toothNum} является молочным`);
			assert.ok(geom.crownPath.length > 10, `Молочный зуб ${toothNum} должен иметь контур коронки`);
			assert.ok(geom.rootPath.length > 10, `Молочный зуб ${toothNum} должен иметь контур корня`);
			assert.ok(geom.touchTargetMinPx >= 44, `Touch-target молочного зуба ${toothNum} обязан быть >= 44px`);

			// Проверка 5 поверхностей
			assert.ok(geom.surfaces.O);
			assert.ok(geom.surfaces.V);
			assert.ok(geom.surfaces.L);
			assert.ok(geom.surfaces.M);
			assert.ok(geom.surfaces.D);
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

	test("Анатомия корней верхних постоянных моляров: 3 корня (MB, DB, P) и 4 канала (MB1, MB2, P, DB)", () => {
		const upperMolars = [16, 17, 18, 26, 27, 28];
		for (const toothNum of upperMolars) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 3, `Верхний моляр ${toothNum} обязан иметь 3 корня`);
			assert.equal(geom.canals.length, 4, `Верхний моляр ${toothNum} имеет 4 анатомических канала`);
			const canalIds = geom.canals.map((c) => c.id);
			assert.deepEqual(canalIds, ["MB1", "MB2", "P", "DB"]);
			assert.equal(geom.apexHalos.length, 3, "Верхний моляр должен иметь 3 апикальных зоны");
		}
	});

	test("Анатомия корней нижних постоянных моляров: 2 корня (M, D) и 3 канала (MB, ML, D)", () => {
		const lowerMolars = [36, 37, 38, 46, 47, 48];
		for (const toothNum of lowerMolars) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 2, `Нижний моляр ${toothNum} обязан иметь 2 корня`);
			assert.equal(geom.canals.length, 3, `Нижний моляр ${toothNum} имеет 3 анатомических канала`);
			const canalIds = geom.canals.map((c) => c.id);
			assert.deepEqual(canalIds, ["MB", "ML", "D"]);
			assert.equal(geom.apexHalos.length, 2, "Нижний моляр должен иметь 2 апикальных зоны");
		}
	});

	test("Анатомия верхних первых премоляров (14, 24): бифуркация корней (B, P)", () => {
		for (const toothNum of [14, 24]) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 2, `Премоляр ${toothNum} имеет 2 бифуркированных корня`);
			const canalIds = geom.canals.map((c) => c.id);
			assert.deepEqual(canalIds, ["B", "P"]);
		}
	});

	test("Анатомия клыков (13, 23, 33, 43): одиночный массивный корень с наибольшей рабочей длиной", () => {
		for (const toothNum of [13, 23, 33, 43]) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 1);
			assert.equal(geom.canals.length, 1);
			const firstCanal = geom.canals[0];
			assert.ok(firstCanal);
			assert.ok(
				firstCanal.defaultLengthMm >= 25.0,
				`Клык ${toothNum} должен иметь длину >= 25мм (фактически ${firstCanal.defaultLengthMm})`,
			);
		}
	});

	test("Анатомия молочных моляров (54, 55, 64, 65, 74, 75, 84, 85)", () => {
		// Верхние молочные моляры: 3 корня
		for (const toothNum of [54, 55, 64, 65]) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 3);
			assert.equal(geom.canals.length, 3);
		}
		// Нижние молочные моляры: 2 корня
		for (const toothNum of [74, 75, 84, 85]) {
			const geom = getAnatomicalToothGeometry(toothNum);
			assert.equal(geom.rootsCount, 2);
			assert.equal(geom.canals.length, 2);
		}
	});

	test("ICDAS II Classification матрица от 0 до 6 содержит все клинические параметры", () => {
		const codes: IcdasCode[] = [0, 1, 2, 3, 4, 5, 6];
		for (const code of codes) {
			const detail = ICDAS_CLASSIFICATIONS[code];
			assert.ok(detail, `Код ICDAS ${code} должен существовать`);
			assert.equal(detail.code, code);
			assert.ok(detail.nameRu.includes(`ICDAS ${code}`));
			assert.ok(detail.descriptionRu.length > 10);
			assert.ok(detail.histologicalDepthRu.length > 5);
			assert.ok(detail.badgeColor.startsWith("#"));
			assert.ok(detail.badgeBg.startsWith("rgba"));
			assert.ok(detail.surfaceOpacity >= 0 && detail.surfaceOpacity <= 1);
		}

		// Прогрессия глубины и цвета от начального к глубокому
		assert.equal(ICDAS_CLASSIFICATIONS[0].surfaceOpacity, 0);
		assert.ok(ICDAS_CLASSIFICATIONS[1].surfaceOpacity < ICDAS_CLASSIFICATIONS[6].surfaceOpacity);
	});

	test("Стоматологические реставрационные материалы и шейдеры содержат полные пресеты", () => {
		const materials = Object.keys(RESTORATIVE_MATERIALS) as (keyof typeof RESTORATIVE_MATERIALS)[];
		assert.deepEqual(materials, [
			"composite",
			"amalgam",
			"ceramic_emax",
			"zirconia",
			"pfm_crown",
			"gold",
			"titanium_implant",
		]);

		for (const matKey of materials) {
			const mat = RESTORATIVE_MATERIALS[matKey];
			assert.ok(mat.nameRu.length > 5);
			assert.ok(mat.descriptionRu.length > 10);
			assert.ok(
				mat.shaderId.startsWith("dente-") ||
					mat.shaderId.includes("-gradient") ||
					mat.shaderAliasId?.startsWith("dente-"),
			);
			assert.ok(mat.strokeColor.startsWith("#"));
			assert.ok(mat.badgeColor.startsWith("#"));
		}

		// PFM Crown metadata verification
		const pfm = RESTORATIVE_MATERIALS.pfm_crown;
		assert.equal(pfm.shaderId, "pfm-crown-gradient");
		assert.equal(pfm.collarShaderId, "pfm-metal-collar");
		assert.ok(pfm.nameRu.includes("Металлокерамика"));

		// Titanium Implant metadata verification
		const implant = RESTORATIVE_MATERIALS.titanium_implant;
		assert.equal(implant.shaderId, "titanium-implant-gradient");
		assert.equal(implant.hexShaderId, "implant-hex-gradient");
		assert.equal(implant.microgroovePatternId, "implant-microgrooves-pattern");
	});

	test("Материалы обтурации корневых каналов и штифты содержат полные пресеты", () => {
		const obturations = Object.keys(CANAL_OBTURATIONS) as (keyof typeof CANAL_OBTURATIONS)[];
		assert.ok(obturations.includes("gutta_percha"));
		assert.ok(obturations.includes("bioceramic"));
		assert.ok(obturations.includes("calcium_hydroxide"));
		assert.ok(obturations.includes("fiber_post"));
		assert.ok(obturations.includes("cast_core_post"));
		assert.ok(obturations.includes("titanium_post"));
		assert.ok(obturations.includes("unfilled"));

		for (const key of obturations) {
			const obt = CANAL_OBTURATIONS[key];
			assert.ok(obt.nameRu.length > 5);
			assert.ok(obt.strokeColor.startsWith("#"));
		}

		// Gutta-percha gradient verification
		const gp = CANAL_OBTURATIONS.gutta_percha;
		assert.equal(gp.shaderId, "gutta-percha-gradient");

		// Cast core post metallic gradient verification
		const castCore = CANAL_OBTURATIONS.cast_core_post;
		assert.equal(castCore.shaderId, "cast-core-post-gradient");
		assert.ok(castCore.nameRu.includes("Литой культевой"));
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
});

