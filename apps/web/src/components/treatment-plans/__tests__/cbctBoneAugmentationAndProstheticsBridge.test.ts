/**
 * cbctBoneAugmentationAndProstheticsBridge.test.ts — остеопластика, синус-лифтинг и ортопедия по КЛКТ.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	buildBoneAugmentationItems,
	buildDestructionAndProstheticsItems,
	type CbctBoneDefectFinding,
	type CbctToothDestructionFinding,
} from "../ctImplantIntegrationBridge";

describe("cbctAutoPlanIntegrationBridge — Остеопластика и ортопедия", () => {
	test("закрытый синус-лифтинг формирует транскрестальный доступ и остеопластику Bio-Oss", () => {
		const defect: CbctBoneDefectFinding = {
			toothFdi: 16,
			region: "maxilla_sinus",
			defectType: "sinus_pneumatization",
			residualHeightMm: 6.2,
			recommendedAugmentation: "closed_sinus_lift",
		};

		const items = buildBoneAugmentationItems(defect, "standard");
		assert.equal(items.length, 2);

		const codes = items.map((i) => i.code804n);
		assert.ok(codes.includes("A16.07.041.002"), "Закрытый синус-лифтинг A16.07.041.002");
		assert.ok(codes.includes("A16.07.041"), "Костная пластика Bio-Oss A16.07.041");

		for (const it of items) {
			assert.equal(it.toothNumber, 16);
		}
	});

	test("открытый синус-лифтинг формирует латеральное окно + Bio-Oss + мембрану Bio-Gide + швы", () => {
		const defect: CbctBoneDefectFinding = {
			toothFdi: 26,
			region: "maxilla_sinus",
			defectType: "sinus_pneumatization",
			residualHeightMm: 3.5,
			recommendedAugmentation: "open_sinus_lift",
		};

		const items = buildBoneAugmentationItems(defect, "standard");
		assert.equal(items.length, 4);

		const codes = items.map((i) => i.code804n);
		assert.ok(codes.includes("A16.07.041.001"), "Открытый синус-лифтинг A16.07.041.001");
		assert.ok(codes.includes("A16.07.041"), "Костная пластика Geistlich Bio-Oss A16.07.041");
		assert.ok(codes.includes("A16.07.041.003"), "Барьерная мембрана Geistlich Bio-Gide A16.07.041.003");
		assert.ok(codes.includes("A16.07.097"), "Швы Vicryl A16.07.097");
	});

	test("несостоятельный корень / поддесневой перелом формирует удаление и консервацию лунки", () => {
		const finding: CbctToothDestructionFinding = {
			toothFdi: 36,
			destructionLevel: "subgingival_fracture_hopeless",
			isHopelessForExtraction: true,
		};

		const result = buildDestructionAndProstheticsItems(finding, "standard");
		assert.ok(result.surgeryItems.length >= 2);

		const codes = result.surgeryItems.map((i) => i.code804n);
		assert.ok(codes.includes("A16.07.001.003"), "Сложное удаление зуба A16.07.001.003");
		assert.ok(codes.includes("A16.07.041"), "Консервация лунки остеопластиком A16.07.041");
	});

	test("периапикальный дефект / пульпит формирует машинное эндо + 3D обтурацию + билд-ап + коронку", () => {
		const finding: CbctToothDestructionFinding = {
			toothFdi: 47,
			destructionLevel: "periodontitis_periapical",
			rootCanalCount: 3,
			crownRecommendation: "zirconia",
		};

		const result = buildDestructionAndProstheticsItems(finding, "standard");
		assert.ok(result.therapyItems.length >= 3);
		assert.ok(result.orthoItems.length >= 3);

		const therapyCodes = result.therapyItems.map((i) => i.code804n);
		assert.ok(therapyCodes.includes("A16.07.030.003"), "Обработка 3 каналов ProTaper A16.07.030.003");
		assert.ok(therapyCodes.includes("A16.07.008.003"), "3D-обтурация 3 каналов A16.07.008.003");
		assert.ok(therapyCodes.includes("A16.07.002.001"), "Культевой билд-ап A16.07.002.001");

		const orthoCodes = result.orthoItems.map((i) => i.code804n);
		assert.ok(orthoCodes.includes("A16.07.004.003"), "Коронка из диоксида циркония A16.07.004.003");
	});

	test("коронки дифференцируются по тарифам (Эконом: металлокерамика, Оптимум: ZrO2, Премиум: E.max)", () => {
		const finding: CbctToothDestructionFinding = {
			toothFdi: 24,
			destructionLevel: "pulpitis",
			rootCanalCount: 2,
		};

		const econ = buildDestructionAndProstheticsItems(finding, "economy");
		const opt = buildDestructionAndProstheticsItems(finding, "standard");
		const prem = buildDestructionAndProstheticsItems(finding, "optimum");

		const econCrown = econ.orthoItems.find((i) => i.code804n === "A16.07.004.001")!;
		const optCrown = opt.orthoItems.find((i) => i.code804n === "A16.07.004.003")!;
		const premCrown = prem.orthoItems.find((i) => i.code804n === "A16.07.004.003")!;

		assert.ok(econCrown.name.includes("Металлокерамическая"));
		assert.ok(optCrown.name.includes("ZrO2"));
		assert.ok(premCrown.name.includes("e.max"));
	});
});
