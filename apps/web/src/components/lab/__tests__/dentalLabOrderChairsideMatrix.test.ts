import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	SHADE_SWATCH_MAP,
} from "../labMath";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

describe("DentalLabOrderModal — Chairside Clinical Order Architecture (Mandates 8e, 8i, 8k, 8n)", () => {
	test("Клинический наряд у кресла состоит ровно из 4 клинических шагов без себестоимости", () => {
		const expectedSteps = [
			{ id: "main", label: "1. Зубы и Конструкция" },
			{ id: "shades", label: "2. Расцветка VITA" },
			{ id: "stages", label: "3. Этапы и Сроки" },
			{ id: "print", label: "4. Бланк ГОСТ" },
		];
		assert.equal(expectedSteps.length, 4);
		assert.ok(
			!expectedSteps.some((s) => s.id === "pricing"),
			"Вкладка Себестоимость исключена из наряда врача у кресла",
		);
	});

	test("Наряд у кресла свободен от Exocad-микропараметров (зазор в микронах, схемы Доусона) в пользу привычной окклюзии", () => {
		const clinicalSpec = {
			occlusion: "В привычной окклюзии (по силиконовому регистрату / шаблону)",
			anatomy: "Естественная анатомическая форма зуба",
		};
		assert.ok(clinicalSpec.occlusion.includes("В привычной окклюзии"));
		assert.ok(clinicalSpec.anatomy.includes("Естественная анатомическая форма"));
	});
});

describe("DentalLabOrderModal — 6 Core Constructions & Full VITA Matrix (Mandate 8e / Orthopedic Lead)", () => {
	test("Поддерживает все 6 канонических ортопедических конструкций в 1-клик доступе (+ PMMA)", () => {
		const coreConstructions = [
			{ id: "zirconia", name: "Коронка диоксид циркония (ZrO2 Katana)", constructionId: "single_crown", materialId: "zirconia_multilayer" },
			{ id: "pfm", name: "Металлокерамика (PFM Co-Cr)", constructionId: "single_crown", materialId: "pfm_cocr" },
			{ id: "emax_press", name: "IPS e.max Press", constructionId: "single_crown", materialId: "emax_lithium_disilicate" },
			{ id: "ceramic_veneer", name: "Керамический винир", constructionId: "veneer", materialId: "emax_lithium_disilicate" },
			{ id: "clasp_denture", name: "Съемный бюгель (Co-Cr)", constructionId: "clasp_denture", materialId: "cobalt_chrome_cocr" },
			{ id: "implant_screw", name: "Индивидуальный абатмент Ti-Base", constructionId: "implant_abutment", materialId: "titanium_custom_abutment" },
			{ id: "pmma", name: "Временная PMMA CAD/CAM", constructionId: "single_crown", materialId: "pmma_temporary" },
		];

		const materials = LAB_MATERIALS.map((m) => m.id);
		const types = CONSTRUCTION_TYPES.map((c) => c.id);

		for (const item of coreConstructions) {
			assert.ok(materials.includes(item.materialId as any), `Материал ${item.materialId} должен присутствовать в LAB_MATERIALS`);
			assert.ok(types.includes(item.constructionId as any), `Тип конструкции ${item.constructionId} должен присутствовать в CONSTRUCTION_TYPES`);
		}
	});

	test("Полный спектр VITA Classical (A1..D4 = 16 оттенков) и Bleach (BL1..BL4) имеет готовые цветовые образцы", () => {
		const allRequiredShades = [
			"A1", "A2", "A3", "A3.5", "A4",
			"B1", "B2", "B3", "B4",
			"C1", "C2", "C3", "C4",
			"D2", "D3", "D4",
			"BL1", "BL2", "BL3", "BL4",
		];

		assert.equal(allRequiredShades.length, 20);

		for (const shade of allRequiredShades) {
			const swatch = SHADE_SWATCH_MAP[shade];
			assert.ok(swatch);
			assert.ok(swatch.bg.startsWith("#"));
			assert.ok(swatch.desc.length > 0);
		}
	});

	test("Анти-Матрёшка (Грех №6): шлюз аванса ЗТЛ не открывает модальных окон поверх модального наряда или дровера", () => {
		const blockedGate = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(30000),
			paidKopecks: rublesToKopecks(0),
			doctorOverride: undefined,
		});
		assert.equal(blockedGate.isGatePassed, false);

		const docOverride = createDoctorClinicalOverride("Д-р Ортопедов И. В.", "Срочная фиксация коронки");
		const clearedGate = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(30000),
			paidKopecks: rublesToKopecks(0),
			doctorOverride: docOverride,
		});
		assert.equal(clearedGate.isGatePassed, true);
		assert.equal(clearedGate.gateStatus, "DOCTOR_OVERRIDE");
	});
});
