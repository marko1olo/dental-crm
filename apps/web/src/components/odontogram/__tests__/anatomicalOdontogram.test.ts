import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ADULT_LOWER_TEETH,
	ADULT_UPPER_TEETH,
	ANATOMICAL_SURFACE_LABELS_RU,
	type AnatomicalSurfaceKey,
	CANAL_OBTURATIONS,
	getAnatomicalGroup,
	getAnatomicalToothGeometry,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	getPhysiologicalRootResorptionGeometry,
	getSurfaceShading,
	ICDAS_CLASSIFICATIONS,
	type IcdasCode,
	isMaxillaryArch,
	isPatientLeftSide,
	isSurfaceActive,
	MIXED_LOWER_TEETH,
	MIXED_UPPER_TEETH,
	normalizeAnatomicalSurfaces,
	normalizeSurfaceKey,
	PEDIATRIC_LOWER_TEETH,
	PEDIATRIC_UPPER_TEETH,
	RESTORATIVE_MATERIALS,
	ROOT_RESORPTION_STAGES,
	type RootResorptionStage,
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

			// Проверка 6 поверхностей
			assert.ok(geom.surfaces.O, `Зуб ${toothNum} обязан иметь окклюзионную/режущую поверхность (O)`);
			assert.ok(geom.surfaces.V, `Зуб ${toothNum} обязан иметь вестибулярную поверхность (V)`);
			assert.ok(geom.surfaces.L, `Зуб ${toothNum} обязан иметь язычную/нёбную поверхность (L)`);
			assert.ok(geom.surfaces.M, `Зуб ${toothNum} обязан иметь медиальную поверхность (M)`);
			assert.ok(geom.surfaces.D, `Зуб ${toothNum} обязан иметь дистальную поверхность (D)`);
			assert.ok(geom.surfaces.C, `Зуб ${toothNum} обязан иметь пришеечную поверхность (C)`);

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

			// Проверка 6 поверхностей
			assert.ok(geom.surfaces.O);
			assert.ok(geom.surfaces.V);
			assert.ok(geom.surfaces.L);
			assert.ok(geom.surfaces.M);
			assert.ok(geom.surfaces.D);
			assert.ok(geom.surfaces.C);
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

	test("Физиологическая резорбция корней молочных зубов (стадии 0%, 25%, 50%, 75%, 100%)", () => {
		// 1. Проверка словаря стадий резорбции
		const stages: RootResorptionStage[] = [0, 25, 50, 75, 100];
		for (const st of stages) {
			const info = ROOT_RESORPTION_STAGES[st];
			assert.ok(info, `Стадия ${st}% должна быть объявлена`);
			assert.equal(info.stage, st);
			assert.equal(info.percent, st);
			assert.ok(info.nameRu.length > 5);
			assert.ok(info.descriptionRu.length > 10);
			assert.ok(info.badgeColor.startsWith("#"));
			assert.ok(info.badgeBg.startsWith("rgba"));
		}

		// Прогрессия прозрачности
		assert.equal(ROOT_RESORPTION_STAGES[0].rootOpacity, 1.0);
		assert.equal(ROOT_RESORPTION_STAGES[25].rootOpacity, 0.9);
		assert.equal(ROOT_RESORPTION_STAGES[50].rootOpacity, 0.65);
		assert.equal(ROOT_RESORPTION_STAGES[75].rootOpacity, 0.35);
		assert.equal(ROOT_RESORPTION_STAGES[100].rootOpacity, 0.0);

		// Проверка штриховки (активна на 50% и 75%)
		assert.equal(ROOT_RESORPTION_STAGES[0].showHatch, false);
		assert.equal(ROOT_RESORPTION_STAGES[25].showHatch, false);
		assert.equal(ROOT_RESORPTION_STAGES[50].showHatch, true);
		assert.equal(ROOT_RESORPTION_STAGES[75].showHatch, true);
		assert.equal(ROOT_RESORPTION_STAGES[100].showHatch, false);

		// 2. Верхний молочный моляр (55)
		const m55_0 = getPhysiologicalRootResorptionGeometry(55, 0);
		assert.equal(m55_0.isResorbed, false);
		assert.equal(m55_0.opacity, 1.0);
		assert.ok(m55_0.rootPath.length > 20);
		assert.equal(m55_0.showCanals, true);
		assert.equal(m55_0.canals.length, 3);

		const m55_25 = getPhysiologicalRootResorptionGeometry(55, 25);
		assert.equal(m55_25.isResorbed, true);
		assert.equal(m55_25.opacity, 0.9);
		assert.ok(m55_25.resorptionLinePath?.startsWith("M"));
		assert.equal(m55_25.showCanals, true);

		const m55_50 = getPhysiologicalRootResorptionGeometry(55, 50);
		assert.equal(m55_50.isResorbed, true);
		assert.equal(m55_50.opacity, 0.65);
		assert.ok(m55_50.resorptionLinePath?.startsWith("M"));
		assert.ok(m55_50.resorptionHatchAreaPath?.startsWith("M"));
		assert.equal(m55_50.showCanals, true);

		const m55_75 = getPhysiologicalRootResorptionGeometry(55, 75);
		assert.equal(m55_75.isResorbed, true);
		assert.equal(m55_75.opacity, 0.35);
		assert.ok(m55_75.resorptionLinePath?.startsWith("M"));
		assert.ok(m55_75.resorptionHatchAreaPath?.startsWith("M"));
		assert.equal(m55_75.showCanals, false);

		const m55_100 = getPhysiologicalRootResorptionGeometry(55, 100);
		assert.equal(m55_100.isResorbed, true);
		assert.equal(m55_100.opacity, 0);
		assert.equal(m55_100.rootPath, "");
		assert.equal(m55_100.showCanals, false);
		assert.equal(m55_100.canals.length, 0);

		// 3. Нижний молочный моляр (84)
		const m84_50 = getPhysiologicalRootResorptionGeometry(84, 50);
		assert.equal(m84_50.isResorbed, true);
		assert.equal(m84_50.opacity, 0.65);
		assert.ok(m84_50.resorptionLinePath?.startsWith("M"));
		assert.ok(m84_50.resorptionHatchAreaPath?.startsWith("M"));
		assert.equal(m84_50.showCanals, true);
		assert.equal(m84_50.canals.length, 2);

		// 4. Молочные резцы и клыки (51, 71)
		const i51_25 = getPhysiologicalRootResorptionGeometry(51, 25);
		assert.equal(i51_25.isResorbed, true);
		assert.equal(i51_25.opacity, 0.9);
		assert.ok(i51_25.resorptionLinePath?.startsWith("M"));

		const i71_100 = getPhysiologicalRootResorptionGeometry(71, 100);
		assert.equal(i71_100.isResorbed, true);
		assert.equal(i71_100.rootPath, "");

		// 5. Постоянный зуб (16) не подвергается физиологической резорбции
		const adult16 = getPhysiologicalRootResorptionGeometry(16, 50);
		assert.equal(adult16.isResorbed, false);
		assert.equal(adult16.opacity, 1.0);
		assert.ok(adult16.rootPath.length > 20);
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

	test("getSurfaceShading возвращает правильные SVG-шейдеры, паттерны и цвета", () => {
		// Кариес
		const cariesShading = getSurfaceShading("Caries");
		assert.equal(cariesShading.fill, "url(#dente-caries-grad)");
		assert.equal(cariesShading.stroke, "#991b1b");
		assert.equal(cariesShading.opacity, 0.95);

		// Пломба: композитная смола (Composite Resin)
		const compShading = getSurfaceShading("Filled", "composite");
		assert.equal(compShading.fill, "url(#composite-fill-gradient)");
		assert.equal(compShading.pattern, "url(#composite-resin-pattern)");
		assert.equal(compShading.stroke, "#0f766e");

		// Пломба: амальгама (Amalgam)
		const amalgamShading = getSurfaceShading("Filled", "amalgam");
		assert.equal(amalgamShading.fill, "url(#amalgam-metal-gradient)");
		assert.equal(amalgamShading.pattern, "url(#amalgam-burnish-pattern)");
		assert.equal(amalgamShading.stroke, "#334155");

		// Пломба/вкладка: IPS E.max Ceramic
		const emaxShading = getSurfaceShading("Filled", "ceramic_emax");
		assert.equal(emaxShading.fill, "url(#ceramic-emax-gradient)");
		assert.equal(emaxShading.pattern, "url(#ceramic-glaze-specular)");
		assert.equal(emaxShading.stroke, "#0284c7");

		// Золотая реставрация
		const goldShading = getSurfaceShading("Filled", "gold");
		assert.equal(goldShading.fill, "url(#gold-crown-gradient)");
		assert.equal(goldShading.stroke, "#b45309");

		// Искусственная коронка (Zirconia, PFM, Gold)
		const zircShading = getSurfaceShading("Crown", "zirconia");
		assert.equal(zircShading.fill, "url(#zirconia-crown-gradient)");
		assert.equal(zircShading.opacity, 1);

		const pfmShading = getSurfaceShading("Crown", "pfm_crown");
		assert.equal(pfmShading.fill, "url(#pfm-crown-gradient)");

		// Здоровая эмаль
		const healthyShading = getSurfaceShading("Healthy");
		assert.equal(healthyShading.fill, "url(#dente-enamel-healthy)");
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

