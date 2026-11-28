/**
 * packages/shared/src/tests/clinicalDefectsDecomposition.test.ts
 *
 * Comprehensive verification of clinicalDefects catalog & ICD-10 clinical presets (6G Live SUT).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_CARIES_PRESETS,
	CLINICAL_ENDODONTIC_PRESETS,
	CLINICAL_NON_CARIES_PRESETS,
	CLINICAL_PERIODONTAL_PRESETS,
	CLINICAL_SURGICAL_PRESETS,
	STOMX_AMOUNT_DEFECTS,
	STOMX_CARIES_DEFECTS,
	STOMX_DEFECT_CARIES,
	STOMX_DEFECT_HEALTHY,
	STOMX_DEFECT_PARODONTITIS,
	STOMX_DEFECT_RECESSION,
	STOMX_DEFECT_REMOVAL,
	STOMX_DEFECTS_TREE,
	STOMX_ENDODONTIC_DEFECTS,
	STOMX_ERUPTION_DEFECTS,
	STOMX_NON_CARIES_DEFECTS,
	STOMX_POSITION_DEFECTS,
	STOMX_TOOTH_DEFECTS,
} from "../clinical/clinicalDefectsData.js";

describe("ClinicalDefects Monolith Decomposition Suite (6G Live SUT)", () => {
	it("preserves exactly 49 items in STOMX_TOOTH_DEFECTS with 100% parity", () => {
		assert.strictEqual(
			STOMX_TOOTH_DEFECTS.length,
			49,
			`Ожидалось ровно 49 дефектов в каталоге, получено ${STOMX_TOOTH_DEFECTS.length}`,
		);

		const healthy = STOMX_TOOTH_DEFECTS[0];
		assert.ok(healthy, "Дефект Healthy обязан присутствовать");
		assert.strictEqual(healthy.id, 2);
		assert.strictEqual(healthy.alias, "ok");
		assert.strictEqual(healthy.color, "green");
		assert.strictEqual(healthy.require_treatment, false);
		assert.strictEqual(healthy.category, "healthy");

		const parodontitis = STOMX_TOOTH_DEFECTS.find((d) => d.id === 10 && d.alias === "A");
		assert.ok(parodontitis, "Пародонтит обязан присутствовать");
		assert.strictEqual(parodontitis?.items?.length, 3, "Пародонтит обязан иметь 3 стадии (AI, AII, AIII)");

		const caries = STOMX_TOOTH_DEFECTS.find((d) => d.id === 6 && d.alias === "С");
		assert.ok(caries, "Кариес обязан присутствовать");
		assert.strictEqual(caries?.crmToothState, "Caries");

		const pulpitis = STOMX_TOOTH_DEFECTS.find((d) => d.id === 7 && d.alias === "Р");
		assert.ok(pulpitis, "Пульпит обязан присутствовать");
		assert.strictEqual(pulpitis?.crmToothState, "Pulpitis");

		const perio = STOMX_TOOTH_DEFECTS.find((d) => d.id === 8 && d.alias === "Pt");
		assert.ok(perio, "Периодонтит обязан присутствовать");
		assert.strictEqual(perio?.crmToothState, "Periodontitis");

		const root = STOMX_TOOTH_DEFECTS.find((d) => d.id === 9 && d.alias === "R");
		assert.ok(root, "Корень обязан присутствовать");
		assert.strictEqual(root?.crmToothState, "Root");

		const rootCaries = STOMX_TOOTH_DEFECTS.find((d) => d.id === 58 && d.alias === "CR");
		assert.ok(rootCaries, "Кариес корня обязан присутствовать");

		const missing = STOMX_TOOTH_DEFECTS.find((d) => d.id === 1 && d.alias === "О" && d.category === "pathology");
		assert.ok(missing, "Отсутствующий зуб обязан присутствовать");

		const filling = STOMX_TOOTH_DEFECTS.find((d) => d.id === 3 && d.alias === "П");
		assert.ok(filling, "Пломба обязана присутствовать");
		assert.strictEqual(filling?.crmToothState, "Filled");

		const crown = STOMX_TOOTH_DEFECTS.find((d) => d.id === 4 && d.alias === "К");
		assert.ok(crown, "Коронка обязана присутствовать");
		assert.strictEqual(crown?.crmToothState, "Crown");

		const implant = STOMX_TOOTH_DEFECTS.find((d) => d.id === 13 && d.alias === "ИМ");
		assert.ok(implant, "Имплантат обязан присутствовать");
		assert.strictEqual(implant?.crmToothState, "Implant");

		const xRayCaries = STOMX_TOOTH_DEFECTS.find((d) => d.id === 19 && d.key === "rg_klkt");
		assert.ok(xRayCaries, "Рентген кариес обязан присутствовать");

		const removal = STOMX_TOOTH_DEFECTS.find((d) => d.id === 1 && d.key === "removal");
		assert.ok(removal, "Хирургическое удаление обязано присутствовать");
		assert.strictEqual(removal?.medplan_only, true);

		assert.strictEqual(STOMX_POSITION_DEFECTS.length, 10, "Должно быть 10 аномалий положения");
		assert.strictEqual(STOMX_ERUPTION_DEFECTS.length, 3, "Должно быть 3 аномалии прорезывания");
		assert.strictEqual(STOMX_AMOUNT_DEFECTS.length, 3, "Должно быть 3 аномалии количества");
	});

	it("preserves exactly 33 items in STOMX_DEFECTS_TREE with hierarchical items", () => {
		assert.strictEqual(
			STOMX_DEFECTS_TREE.length,
			33,
			`Ожидалось 33 элемента в дереве дефектов, получено ${STOMX_DEFECTS_TREE.length}`,
		);

		const parodontitisInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "A");
		assert.ok(parodontitisInTree);
		assert.strictEqual(parodontitisInTree.items?.length, 3);
		assert.deepStrictEqual(
			parodontitisInTree.items?.map((i) => i.alias),
			["AI", "AII", "AIII"],
		);

		const recessionInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "Рд");
		assert.ok(recessionInTree);
		assert.strictEqual(recessionInTree.items?.length, 4);
		assert.deepStrictEqual(
			recessionInTree.items?.map((i) => i.alias),
			["Рд1", "Рд2", "Рд3", "Рд4"],
		);
	});

	it("verifies domain-specific submodules export valid arrays", () => {
		assert.strictEqual(STOMX_CARIES_DEFECTS.length, 5);
		assert.strictEqual(STOMX_NON_CARIES_DEFECTS.length, 4);
		assert.strictEqual(STOMX_ENDODONTIC_DEFECTS.length, 5);
		assert.strictEqual(STOMX_DEFECT_HEALTHY.id, 2);
		assert.strictEqual(STOMX_DEFECT_PARODONTITIS.id, 10);
		assert.strictEqual(STOMX_DEFECT_RECESSION.id, 78);
		assert.strictEqual(STOMX_DEFECT_CARIES.id, 6);
		assert.strictEqual(STOMX_DEFECT_REMOVAL.id, 1);
	});

	it("verifies clinical presets (Black I..VI, ICD-10 K02..K08, 804n) for Mandate 8e Doctor Autonomy", () => {
		assert.ok(CLINICAL_CARIES_PRESETS.length >= 10, "Должно быть не менее 10 пресетов кариеса");
		const blackI = CLINICAL_CARIES_PRESETS.find((p) => p.code === "CARIES_MODERATE_BLACK_I");
		assert.ok(blackI);
		assert.strictEqual(blackI?.mkb10, "K02.1");
		assert.ok(blackI?.recommended804nCodes?.includes("A16.07.002.001"));
		assert.ok((blackI?.doctorFastNoteTemplate?.length ?? 0) > 20);

		assert.ok(CLINICAL_NON_CARIES_PRESETS.length >= 5);
		const wedge = CLINICAL_NON_CARIES_PRESETS.find((p) => p.code === "NON_CARIES_WEDGE_DEFECT_INITIAL");
		assert.ok(wedge);
		assert.strictEqual(wedge?.mkb10, "K03.1");

		assert.ok(CLINICAL_ENDODONTIC_PRESETS.length >= 5);
		const pulpitisPreset = CLINICAL_ENDODONTIC_PRESETS.find((p) => p.code === "PULPITIS_ACUTE_FOCAL");
		assert.ok(pulpitisPreset);
		assert.strictEqual(pulpitisPreset?.mkb10, "K04.01");

		assert.ok(CLINICAL_PERIODONTAL_PRESETS.length >= 4);
		const perioPreset = CLINICAL_PERIODONTAL_PRESETS.find((p) => p.code === "PERIODONTITIS_CHRONIC_MILD");
		assert.ok(perioPreset);
		assert.strictEqual(perioPreset?.mkb10, "K05.3");

		assert.ok(CLINICAL_SURGICAL_PRESETS.length >= 3);
		const surgPreset = CLINICAL_SURGICAL_PRESETS.find((p) => p.code === "SURGERY_EXTRACTION_SIMPLE");
		assert.ok(surgPreset);
		assert.strictEqual(surgPreset?.mkb10, "K08.1");
	});

	it("verifies unique preset codes, valid ICD-10 format, and tree/flat defect key consistency across all exported submodules", () => {
		const allPresets = [
			...CLINICAL_CARIES_PRESETS,
			...CLINICAL_NON_CARIES_PRESETS,
			...CLINICAL_ENDODONTIC_PRESETS,
			...CLINICAL_PERIODONTAL_PRESETS,
			...CLINICAL_SURGICAL_PRESETS,
		];
		const seenCodes = new Set<string>();
		for (const preset of allPresets) {
			assert.strictEqual(seenCodes.has(preset.code), false, `Duplicate preset code ${preset.code}`);
			seenCodes.add(preset.code);
			assert.match(preset.mkb10, /^K\d{2}(\.\d{1,2})?$/, `Invalid ICD-10 code on ${preset.code}: ${preset.mkb10}`);
			assert.ok(preset.doctorFastNoteTemplate.trim().length >= 10, `Empty fast note template on ${preset.code}`);
		}

		const flatKeys = new Set(STOMX_TOOTH_DEFECTS.map((d) => d.key));
		assert.strictEqual(flatKeys.has(STOMX_DEFECT_HEALTHY.key), true);
		assert.strictEqual(flatKeys.has(STOMX_DEFECT_CARIES.key), true);
		assert.strictEqual(flatKeys.has(STOMX_DEFECT_PARODONTITIS.key), true);
		assert.strictEqual(flatKeys.has(STOMX_DEFECT_RECESSION.key), true);
		assert.strictEqual(flatKeys.has(STOMX_DEFECT_REMOVAL.key), true);
	});
});
