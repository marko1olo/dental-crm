/**
 * treatmentPlanStagesCatalog.test.ts — Тестирование словаря процедур каталога,
 * молочных и постоянных зубов, жевательной группы и интактных зубов.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	generateTreatmentPlanStages,
	isDeciduousTooth,
	isMolarOrPremolar,
	ORDER_804N_DICTIONARY,
} from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Service Catalog & Clinical Anatomy", () => {
	test("Все процедуры каталога услуг имеют валидный код, категорию, этап и материалы", () => {
		const expectedCodes: Record<string, string> = {
			DiagnosticsCT: "A06.07.004",
			HygieneComplex: "A16.07.050",
			PeriodontalScalingSRP: "A16.07.051",
			PeriodontalClosedCurettage: "A16.07.039",
			PeriodontalSplinting: "A16.07.019",
			CariesTherapy: "A16.07.002.001",
			PulpitisEndo: "A16.07.008.002",
			PeriodontitisTherapy: "A16.07.009.001",
			PediatricCariesTherapy: "A16.07.002.001",
			PediatricPulpitisPulpotomy: "A16.07.008.001",
			PediatricExtraction: "A16.07.001",
			PediatricFissureSealing: "A16.07.057",
			PediatricCrownSSC: "A16.07.004.003",
			SimpleExtraction: "A16.07.001.001",
			ComplexExtraction: "A16.07.001.002",
			BoneGraftingSinusLift: "A16.07.041",
			SurgicalNavigationGuide: "A16.07.054",
			AllOn4SurgicalGuide: "A16.07.054",
			DentalImplantation: "A16.07.054.001",
			AllOn4Implantation: "A16.07.054.001",
			MultiUnitAbutment: "A16.07.006.002",
			IntraoralScanning3D: "A02.07.010",
			InlayOnlay: "A16.07.003",
			CrownZirconia: "A16.07.004.001",
			CrownEmaxCeramic: "A16.07.004.002",
			BridgeProsthesis: "A16.07.005",
			AllOn4Prosthesis: "A16.07.035",
			ImplantCrownProsthetics: "A16.07.006",
		};

		for (const [key, code] of Object.entries(expectedCodes)) {
			const def = ORDER_804N_DICTIONARY[key];
			assert.ok(def, "Определение для " + key + " должно существовать");
			assert.equal(def.code, code, "Код процедуры для " + key + " должен быть " + code);
			assert.ok(def.title.length > 0, "Название для " + key + " не должно быть пустым");
			assert.ok(def.defaultPriceRub > 0, "Цена по умолчанию для " + key + " > 0");
			assert.ok(def.stageNumber >= 1 && def.stageNumber <= 3, "Номер этапа должен быть 1, 2 или 3");
			assert.ok(def.materialsDefault.length > 0, "Материалы по умолчанию должны быть указаны");
		}
	});

	test("Функция isDeciduousTooth корректно определяет временные (молочные) зубы 51..85", () => {
		assert.equal(isDeciduousTooth(11), false);
		assert.equal(isDeciduousTooth(16), false);
		assert.equal(isDeciduousTooth(24), false);
		assert.equal(isDeciduousTooth(36), false);
		assert.equal(isDeciduousTooth(48), false);

		assert.equal(isDeciduousTooth(51), true);
		assert.equal(isDeciduousTooth(55), true);
		assert.equal(isDeciduousTooth(64), true);
		assert.equal(isDeciduousTooth(72), true);
		assert.equal(isDeciduousTooth(85), true);
	});

	test("isMolarOrPremolar корректно определяет жевательную группу зубов", () => {
		assert.equal(isMolarOrPremolar(11), false);
		assert.equal(isMolarOrPremolar(12), false);
		assert.equal(isMolarOrPremolar(13), false);
		assert.equal(isMolarOrPremolar(14), true);
		assert.equal(isMolarOrPremolar(16), true);
		assert.equal(isMolarOrPremolar(35), true);
		assert.equal(isMolarOrPremolar(47), true);
		assert.equal(isMolarOrPremolar(54), false);
	});

	test("Интактные зубы (Healthy/Filled) генерируют пустые этапы", () => {
		const healthyTeeth: ToothData[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Filled" },
		];

		const stages = generateTreatmentPlanStages(healthyTeeth);
		assert.equal(stages.length, 3);
		assert.equal(stages[0]?.items.length, 0);
		assert.equal(stages[1]?.items.length, 0);
		assert.equal(stages[2]?.items.length, 0);
		assert.equal(stages[0]?.totalRub, 0);
	});
});
