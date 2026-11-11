import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CANAL_OBTURATIONS,
	getSurfaceShading,
	ICDAS_CLASSIFICATIONS,
	RESTORATIVE_MATERIALS,
} from "../anatomicalMaterialsAndSurfaces";
import {
	detectBridgeSpans,
	getBridgeSpanForTooth,
	isToothAbutment,
	isToothPontic,
	isToothPonticInBridge,
} from "../anatomicalBridges";
import { getPhysiologicalRootResorptionGeometry } from "../anatomicalPediatricGeometries";
import {
	type IcdasCode,
	ROOT_RESORPTION_STAGES,
	type RootResorptionStage,
} from "../anatomicalGeometriesTypes";
import type { ToothData } from "../ToothChart";

describe("Anatomical Shading, Materials, Resorption & ICDAS Suite", () => {
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
			"titanium",
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
});

describe("Bridge Prosthetics & Pontic Spans Engine (Fixed Dental Bridge)", () => {
	test("isToothAbutment определяет коронки и опорные зубы", () => {
		assert.equal(isToothAbutment({ toothNumber: 16, state: "Crown" }), true);
		assert.equal(isToothAbutment({ toothNumber: 16, state: "Caries" }), false);
		assert.equal(
			isToothAbutment({
				toothNumber: 14,
				state: "Filled",
				clinicalData: { isAbutment: true },
			}),
			true,
		);
		assert.equal(
			isToothAbutment({
				toothNumber: 14,
				state: "Healthy",
				notes: "Опорный зуб мостовидного протеза",
			}),
			true,
		);
	});

	test("isToothPontic определяет отсутствующие зубы и промежуточные фасетки", () => {
		assert.equal(isToothPontic({ toothNumber: 15, state: "Missing" }), true);
		assert.equal(
			isToothPontic({
				toothNumber: 15,
				state: "Healthy",
				clinicalData: { isPontic: true },
			}),
			true,
		);
		assert.equal(
			isToothPontic({
				toothNumber: 15,
				state: "Filled",
				notes: "Фасетка моста",
			}),
			true,
		);
	});

	test("detectBridgeSpans обнаруживает непрерывный мост 16-15-14 (опора 16, тело 15, опора 14)", () => {
		const topArch = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
		const teethData: ToothData[] = [
			{ toothNumber: 16, state: "Crown", material: "zirconia" },
			{ toothNumber: 15, state: "Missing" },
			{ toothNumber: 14, state: "Crown", material: "zirconia" },
		];

		const spans = detectBridgeSpans(topArch, teethData);
		assert.equal(spans.length, 1);
		const bridge = spans[0]!;
		assert.equal(bridge.id, "bridge-16-14");
		assert.equal(bridge.arch, "upper");
		assert.equal(bridge.material, "zirconia");
		assert.deepEqual([...bridge.teeth], [16, 15, 14]);
		assert.deepEqual([...bridge.abutments], [16, 14]);
		assert.deepEqual([...bridge.pontics], [15]);
		assert.equal(bridge.startTooth, 16);
		assert.equal(bridge.endTooth, 14);

		assert.equal(isToothPonticInBridge(15, spans), true);
		assert.equal(isToothPonticInBridge(16, spans), false);
		assert.equal(isToothPonticInBridge(14, spans), false);
		assert.equal(isToothPonticInBridge(13, spans), false);

		const tooth15Span = getBridgeSpanForTooth(15, spans);
		assert.ok(tooth15Span);
		assert.equal(tooth15Span.id, "bridge-16-14");
	});

	test("detectBridgeSpans обнаруживает протяженный мост на 2 промежуточных тела (47-46-45-44)", () => {
		const bottomArch = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
		const teethData: ToothData[] = [
			{ toothNumber: 47, state: "Crown", material: "ceramic_emax" },
			{ toothNumber: 46, state: "Missing" },
			{ toothNumber: 45, state: "Missing" },
			{ toothNumber: 44, state: "Crown", material: "ceramic_emax" },
		];

		const spans = detectBridgeSpans(bottomArch, teethData);
		assert.equal(spans.length, 1);
		const bridge = spans[0]!;
		assert.equal(bridge.id, "bridge-47-44");
		assert.equal(bridge.arch, "lower");
		assert.equal(bridge.material, "ceramic_emax");
		assert.deepEqual([...bridge.teeth], [47, 46, 45, 44]);
		assert.deepEqual([...bridge.abutments], [47, 44]);
		assert.deepEqual([...bridge.pontics], [46, 45]);
	});

	test("getSurfaceShading для Retained и Root возвращает специализированные стили", () => {
		const retainedShading = getSurfaceShading("Retained");
		assert.equal(retainedShading.stroke, "#8b5cf6");
		assert.equal(retainedShading.opacity, 0.85);

		const rootShading = getSurfaceShading("Root");
		assert.equal(rootShading.stroke, "#dc2626");
		assert.equal(rootShading.opacity, 1);
	});
});
