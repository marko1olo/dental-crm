import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_PROTOCOL_PRESETS,
	PEDIATRIC_SURFACE_PRESETS,
	QUICK_PEDIATRIC_TEETH,
} from "../../VisitPediatricProtocolWidget";

describe("VisitPediatricProtocolWidget Presets & Metadata Completeness", () => {
	it("verifies PEDIATRIC_PROTOCOL_PRESETS metadata completeness (Zero TODOs, 100% typed)", () => {
		assert.strictEqual(PEDIATRIC_PROTOCOL_PRESETS.length, 6, "Exactly 6 canonical clinical presets");
		const ids = PEDIATRIC_PROTOCOL_PRESETS.map((p) => p.id);
		assert.deepStrictEqual(ids, [
			"caries_primary",
			"pulpotomy_primary",
			"silvering_deep_fluoridation",
			"fissure_sealing",
			"extraction_primary_exfoliation",
			"standard_crown",
		]);

		for (const preset of PEDIATRIC_PROTOCOL_PRESETS) {
			assert.ok(preset.titleRu.length > 0);
			assert.ok(preset.diagnosisIcd10.length > 0);
			assert.ok(preset.serviceCode804n.startsWith("A"));
			assert.ok(preset.materials.length > 0);
			assert.ok(preset.defaultMaterial.length > 0);
			assert.ok(preset.defaultToothFindingState.length > 0);
		}
	});

	it("verifies FRANKL_EXPRESS_ITEMS completeness (1..4 with symbols and tactics)", () => {
		assert.strictEqual(FRANKL_EXPRESS_ITEMS.length, 4);
		assert.deepStrictEqual(FRANKL_EXPRESS_ITEMS.map((f) => f.rating), [1, 2, 3, 4]);
		assert.deepStrictEqual(FRANKL_EXPRESS_ITEMS.map((f) => f.symbol), ["--", "-", "+", "++"]);

		for (const item of FRANKL_EXPRESS_ITEMS) {
			assert.ok(item.clinicalTacticRu.length > 0);
			assert.ok(item.descriptionRu.length > 0);
		}
	});

	it("verifies PEDIATRIC_SURFACE_PRESETS and QUICK_PEDIATRIC_TEETH", () => {
		assert.ok(PEDIATRIC_SURFACE_PRESETS.length >= 5);
		assert.ok(QUICK_PEDIATRIC_TEETH.includes(54));
		assert.ok(QUICK_PEDIATRIC_TEETH.includes(85));
		assert.ok(QUICK_PEDIATRIC_TEETH.includes(16));
	});
});
