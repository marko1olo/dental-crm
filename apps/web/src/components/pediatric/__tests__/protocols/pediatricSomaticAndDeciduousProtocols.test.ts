import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	PEDIATRIC_SOMATIC_NORM_SUMMARY,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
	DEFAULT_LEGAL_REPRESENTATIVE,
} from "../../PediatricSomaticAndLegalRep";
import {
	PEDIATRIC_PROTOCOL_PRESETS,
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_TEETH_NAMES,
} from "../../VisitPediatricProtocolWidget";
import {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	isDeciduousTooth,
} from "@dental/shared";

describe("0-Click Somatic Status & Purged Academic Clutter", () => {
	it("provides exact zero-click somatic norm summary text", () => {
		assert.strictEqual(PEDIATRIC_SOMATIC_NORM_SUMMARY, "Ребенок соматически здоров, контактен. Аллергии нет");
	});

	it("default somatic status reflects physiologic health without unnecessary survey blocking", () => {
		assert.strictEqual(DEFAULT_PEDIATRIC_SOMATIC_NORM.isNormal, true);
		assert.strictEqual(DEFAULT_PEDIATRIC_SOMATIC_NORM.summaryRu, PEDIATRIC_SOMATIC_NORM_SUMMARY);
		assert.ok(DEFAULT_PEDIATRIC_SOMATIC_NORM.allergiesRu.includes("отсутствует"));
		assert.ok(DEFAULT_PEDIATRIC_SOMATIC_NORM.chronicDiseasesRu.includes("отсутствуют"));
		assert.ok(DEFAULT_PEDIATRIC_SOMATIC_NORM.physicalDevelopmentRu.includes("соответствует"));
	});

	it("default legal representative comes pre-configured with clean human representative reference", () => {
		assert.strictEqual(DEFAULT_LEGAL_REPRESENTATIVE.role, "Мать");
		assert.strictEqual(DEFAULT_LEGAL_REPRESENTATIVE.consentSigned, true);
		assert.ok(DEFAULT_LEGAL_REPRESENTATIVE.statutoryDocument.includes("Законный представитель"));
	});
});

describe("20 Deciduous Teeth (FDI 51-85) Protocols", () => {
	it("contains exactly 20 primary teeth in ALL_PRIMARY_TEETH", () => {
		assert.strictEqual(ALL_PRIMARY_TEETH.length, 20);
		for (const t of ALL_PRIMARY_TEETH) {
			const q = Math.floor(t / 10);
			assert.ok(q >= 5 && q <= 8);
		}
	});

	it("correctly identifies all 4 quadrants of deciduous teeth", () => {
		assert.deepStrictEqual(PRIMARY_UPPER_RIGHT, [55, 54, 53, 52, 51]);
		assert.deepStrictEqual(PRIMARY_UPPER_LEFT, [61, 62, 63, 64, 65]);
		assert.deepStrictEqual(PRIMARY_LOWER_LEFT, [71, 72, 73, 74, 75]);
		assert.deepStrictEqual(PRIMARY_LOWER_RIGHT, [85, 84, 83, 82, 81]);
	});

	it("validates isDeciduousTooth helper for deciduous vs permanent teeth", () => {
		for (const t of [51, 55, 63, 74, 85]) {
			assert.strictEqual(isDeciduousTooth(t), true);
		}
		for (const t of [11, 16, 26, 36, 46]) {
			assert.strictEqual(isDeciduousTooth(t), false);
		}
	});

	it("includes all 5 core required pediatric 1-click chairside presets", () => {
		const presetIds = PEDIATRIC_PROTOCOL_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("silvering_deep_fluoridation"));
		assert.ok(presetIds.includes("fissure_sealing"));
		assert.ok(presetIds.includes("pulpotomy_primary"));
		assert.ok(presetIds.includes("standard_crown"));
		assert.ok(presetIds.includes("extraction_primary_exfoliation"));
	});

	it("each preset defines valid ICD-10 code and 804n nomenclature service code", () => {
		for (const preset of PEDIATRIC_PROTOCOL_PRESETS) {
			assert.ok(/^K0[248]\./.test(preset.diagnosisIcd10));
			assert.ok(/^[AB]\d{2}\.\d{2}\.\d{3}/.test(preset.serviceCode804n));
			assert.ok(preset.materials.length > 0);
			assert.ok(preset.titleRu.length > 5);
		}
	});

	it("provides Frankl behavioral rating express items from 1 to 4", () => {
		assert.strictEqual(FRANKL_EXPRESS_ITEMS.length, 4);
		assert.deepStrictEqual(FRANKL_EXPRESS_ITEMS.map((f) => f.rating), [1, 2, 3, 4]);
	});

	it("correctly maps human-readable names for deciduous molars and incisors", () => {
		assert.ok(PEDIATRIC_TEETH_NAMES[51].includes("резец"));
		assert.ok(PEDIATRIC_TEETH_NAMES[55].includes("моляр"));
		assert.ok(PEDIATRIC_TEETH_NAMES[75].includes("моляр"));
		assert.ok(PEDIATRIC_TEETH_NAMES[85].includes("моляр"));
	});
});
