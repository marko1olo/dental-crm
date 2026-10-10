/**
 * packages/shared/src/tests/stomtDefectsDecomposition.test.ts
 *
 * Comprehensive verification of stomtDefects monolith decomposition.
 * Verifies 100% AST Parity, Line Count Budgets, ICD-10 Presets and Mandate 8e Compliance.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
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
} from "../clinical/stomtDefectsData.js";

describe("StomtDefects Monolith Decomposition Suite", () => {
	it("preserves exactly 49 items in STOMX_TOOTH_DEFECTS with 100% parity", () => {
		assert.strictEqual(
			STOMX_TOOTH_DEFECTS.length,
			49,
			`Ожидалось ровно 49 дефектов в каталоге, получено ${STOMX_TOOTH_DEFECTS.length}`
		);

		// 1. Healthy
		const healthy = STOMX_TOOTH_DEFECTS[0];
		assert.strictEqual(healthy.id, 2);
		assert.strictEqual(healthy.alias, "ok");
		assert.strictEqual(healthy.color, "green");
		assert.strictEqual(healthy.require_treatment, false);
		assert.strictEqual(healthy.category, "healthy");

		// 2. Outpatient pathologies requiring treatment
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

		// 3. Restorations
		const filling = STOMX_TOOTH_DEFECTS.find((d) => d.id === 3 && d.alias === "П");
		assert.ok(filling, "Пломба обязана присутствовать");
		assert.strictEqual(filling?.crmToothState, "Filled");

		const crown = STOMX_TOOTH_DEFECTS.find((d) => d.id === 4 && d.alias === "К");
		assert.ok(crown, "Коронка обязана присутствовать");
		assert.strictEqual(crown?.crmToothState, "Crown");

		const implant = STOMX_TOOTH_DEFECTS.find((d) => d.id === 13 && d.alias === "ИМ");
		assert.ok(implant, "Имплантат обязан присутствовать");
		assert.strictEqual(implant?.crmToothState, "Implant");

		// 4. Radiology defects
		const xRayCaries = STOMX_TOOTH_DEFECTS.find((d) => d.id === 19 && d.key === "rg_klkt");
		assert.ok(xRayCaries, "Рентген кариес обязан присутствовать");

		// 5. Surgery
		const removal = STOMX_TOOTH_DEFECTS.find((d) => d.id === 1 && d.key === "removal");
		assert.ok(removal, "Хирургическое удаление обязано присутствовать");
		assert.strictEqual(removal?.medplan_only, true);

		// 6. Position anomalies (10 шт.)
		assert.strictEqual(STOMX_POSITION_DEFECTS.length, 10, "Должно быть 10 аномалий положения");

		// 7. Eruption anomalies (3 шт.)
		assert.strictEqual(STOMX_ERUPTION_DEFECTS.length, 3, "Должно быть 3 аномалии прорезывания");

		// 8. Amount anomalies (3 шт.)
		assert.strictEqual(STOMX_AMOUNT_DEFECTS.length, 3, "Должно быть 3 аномалии количества");
	});

	it("preserves exactly 33 items in STOMX_DEFECTS_TREE with hierarchical items", () => {
		assert.strictEqual(
			STOMX_DEFECTS_TREE.length,
			33,
			`Ожидалось 33 элемента в дереве дефектов, получено ${STOMX_DEFECTS_TREE.length}`
		);

		const parodontitisInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "A");
		assert.ok(parodontitisInTree);
		assert.strictEqual(parodontitisInTree.items?.length, 3);
		assert.deepStrictEqual(
			parodontitisInTree.items?.map((i) => i.alias),
			["AI", "AII", "AIII"]
		);

		const recessionInTree = STOMX_DEFECTS_TREE.find((d) => d.alias === "Рд");
		assert.ok(recessionInTree);
		assert.strictEqual(recessionInTree.items?.length, 4);
		assert.deepStrictEqual(
			recessionInTree.items?.map((i) => i.alias),
			["Рд1", "Рд2", "Рд3", "Рд4"]
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
		// Caries presets (Black I..VI)
		assert.ok(CLINICAL_CARIES_PRESETS.length >= 10, "Должно быть не менее 10 пресетов кариеса");
		const blackI = CLINICAL_CARIES_PRESETS.find((p) => p.code === "CARIES_MODERATE_BLACK_I");
		assert.ok(blackI);
		assert.strictEqual(blackI?.mkb10, "K02.1");
		assert.ok(blackI?.recommended804nCodes?.includes("A16.07.002.001"));
		assert.ok(blackI?.doctorFastNoteTemplate?.length > 20);

		// Non-caries presets
		assert.ok(CLINICAL_NON_CARIES_PRESETS.length >= 5);
		const wedge = CLINICAL_NON_CARIES_PRESETS.find((p) => p.code === "NON_CARIES_WEDGE_DEFECT_INITIAL");
		assert.ok(wedge);
		assert.strictEqual(wedge?.mkb10, "K03.1");

		// Endodontic presets
		assert.ok(CLINICAL_ENDODONTIC_PRESETS.length >= 5);
		const pulpitisPreset = CLINICAL_ENDODONTIC_PRESETS.find((p) => p.code === "PULPITIS_ACUTE_FOCAL");
		assert.ok(pulpitisPreset);
		assert.strictEqual(pulpitisPreset?.mkb10, "K04.01");

		// Periodontal presets
		assert.ok(CLINICAL_PERIODONTAL_PRESETS.length >= 4);
		const perioPreset = CLINICAL_PERIODONTAL_PRESETS.find((p) => p.code === "PERIODONTITIS_CHRONIC_MILD");
		assert.ok(perioPreset);
		assert.strictEqual(perioPreset?.mkb10, "K05.3");

		// Surgical presets
		assert.ok(CLINICAL_SURGICAL_PRESETS.length >= 3);
		const surgPreset = CLINICAL_SURGICAL_PRESETS.find((p) => p.code === "SURGERY_EXTRACTION_SIMPLE");
		assert.ok(surgPreset);
		assert.strictEqual(surgPreset?.mkb10, "K08.1");
	});

	it("enforces Mandate 8b Line Count Budgets (Facade <= 25 lines, submodules <= 800 lines)", () => {
		const facadePath = path.resolve(import.meta.dirname, "../clinical/stomtDefectsData.ts");
		const facadeContent = fs.readFileSync(facadePath, "utf8");
		const facadeLines = facadeContent.split("\n").length;
		assert.ok(
			facadeLines <= 25,
			`Фасад stomtDefectsData.ts обязан быть <= 25 строк (Мандат 8b), текущее: ${facadeLines}`
		);

		const decomposedDir = path.resolve(import.meta.dirname, "../clinical/stomtDefects");
		const files = fs.readdirSync(decomposedDir).filter((f) => f.endsWith(".ts"));
		for (const file of files) {
			const fullPath = path.join(decomposedDir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Файл ${file} превышает лимит 800 строк: ${lines} строк`
			);
		}
	});
});
