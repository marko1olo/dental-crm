import assert from "node:assert";
import { describe, it } from "node:test";
import {
	convertFormulaToOdontogramData,
	convertOdontogramDataToFormula,
	formatToothFormulaSummary,
	getStomxDefectBadgeProps,
	toggleStomxDefectOnTooth,
} from "../stomxFormulaAdapter";
import type { ToothFormulaItem } from "../types";

describe("StomX Dental Formula Adapter & UI Logic", () => {
	it("converts odontogram ToothData to ToothFormulaItem", () => {
		const formulaItem = convertOdontogramDataToFormula(16, {
			state: "Caries",
			surfaces: ["O", "M"],
			mobility: 1,
			notes: "Глубокий кариес",
		});

		assert.strictEqual(formulaItem.toothNumber, 16);
		assert.strictEqual(formulaItem.state, "Caries");
		assert.deepStrictEqual(formulaItem.stomxDefects, ["С"]);
		assert.deepStrictEqual(formulaItem.surfaces, ["O", "M"]);
		assert.strictEqual(formulaItem.mobility, 1);
		assert.strictEqual(formulaItem.requireTreatment, true);
	});

	it("converts ToothFormulaItem back to Partial<ToothData>", () => {
		const item: ToothFormulaItem = {
			toothNumber: 24,
			state: "Pulpitis",
			stomxDefects: ["Р"],
			surfaces: ["O"],
			mobility: 0,
			notes: "Острый пульпит",
		};

		const data = convertFormulaToOdontogramData(item);
		assert.strictEqual(data.toothNumber, 24);
		assert.strictEqual(data.state, "Pulpitis");
		assert.deepStrictEqual(data.surfaces, ["O"]);
		assert.strictEqual(data.mobility, 0);
		assert.strictEqual(data.notes, "Острый пульпит");
	});

	it("toggles StomX defects and transitions CRM state", () => {
		let tooth: ToothFormulaItem = {
			toothNumber: 11,
			state: "Healthy",
			stomxDefects: [],
		};

		// 1. Add Caries ("С")
		tooth = toggleStomxDefectOnTooth(tooth, "С");
		assert.deepStrictEqual(tooth.stomxDefects, ["С"]);
		assert.strictEqual(tooth.state, "Caries");
		assert.strictEqual(tooth.requireTreatment, true);

		// 2. Add Crown ("К")
		tooth = toggleStomxDefectOnTooth(tooth, "К");
		assert.ok(tooth.stomxDefects.includes("К"));
		assert.strictEqual(tooth.state, "Crown");

		// 3. Add Position Anomaly ("В" - vestibular)
		tooth = toggleStomxDefectOnTooth(tooth, "В", true);
		assert.strictEqual(tooth.positionAnomaly, "В");

		// 4. Toggle "В" off
		tooth = toggleStomxDefectOnTooth(tooth, "В", true);
		assert.strictEqual(tooth.positionAnomaly, undefined);

		// 5. Apply "ok" (Healthy reset)
		tooth = toggleStomxDefectOnTooth(tooth, "ok");
		assert.strictEqual(tooth.state, "Healthy");
		assert.deepStrictEqual(tooth.stomxDefects, []);
		assert.strictEqual(tooth.requireTreatment, false);
		assert.strictEqual(tooth.positionAnomaly, undefined);
	});

	it("provides correct badge styling for colors", () => {
		const greenBadge = getStomxDefectBadgeProps("ok");
		assert.strictEqual(greenBadge.color, "green");
		assert.ok(greenBadge.badgeBg.includes("emerald"));

		const redBadge = getStomxDefectBadgeProps("С");
		assert.strictEqual(redBadge.color, "red");
		assert.ok(redBadge.badgeBg.includes("rose"));

		const yellowBadge = getStomxDefectBadgeProps("П");
		assert.strictEqual(yellowBadge.color, "yellow");
		assert.ok(yellowBadge.badgeBg.includes("amber"));

		const posBadge = getStomxDefectBadgeProps("Т");
		assert.strictEqual(posBadge.color, "white");
	});

	it("formats descriptive tooth summary for 043/u clinical notes", () => {
		const item: ToothFormulaItem = {
			toothNumber: 36,
			state: "Periodontitis",
			stomxDefects: ["Pt"],
			positionAnomaly: "Т",
			surfaces: ["O", "D"],
		};

		const summary = formatToothFormulaSummary(item);
		assert.ok(summary.includes("Periodontitis"));
		assert.ok(summary.includes("тортоаномалия"));
		assert.ok(summary.includes("периодонтит"));
		assert.ok(summary.includes("O, D"));

		const healthyItem: ToothFormulaItem = {
			toothNumber: 11,
			state: "Healthy",
			stomxDefects: [],
		};
		assert.strictEqual(formatToothFormulaSummary(healthyItem), "Здоров (норма)");
	});
});
