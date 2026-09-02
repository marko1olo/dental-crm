/**
 * chairsidePhotoProtocol.test.ts — Unit tests for Chairside Photo Protocol & Comparison Slider
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	STANDARD_12_SLOT_PROTOCOL,
	AACD_DSD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	getPresetById,
	getSlotDefinitionById,
} from "../../photography/photoGridPresets";
import {
	VITA_SHADES,
	calculateComparisonClipPath,
	formatChairsidePhotoProtocolDiaryRu,
} from "../chairsidePhotoProtocolConstants";

describe("ChairsidePhotoProtocol — Presets & Slot Invariants", () => {
	it("1. Standard 12-Slot Protocol contains all 12 canonical AACD/DSD clinical slots", () => {
		assert.equal(STANDARD_12_SLOT_PROTOCOL.totalSlots, 12);
		assert.equal(STANDARD_12_SLOT_PROTOCOL.slots.length, 12);

		const slotIds = STANDARD_12_SLOT_PROTOCOL.slots.map((s) => s.id);
		assert.ok(slotIds.includes("portrait_rest"));
		assert.ok(slotIds.includes("portrait_smile"));
		assert.ok(slotIds.includes("portrait_smile_wide"));
		assert.ok(slotIds.includes("profile_90_rest"));
		assert.ok(slotIds.includes("profile_90_smile"));
		assert.ok(slotIds.includes("portrait_45_smile"));
		assert.ok(slotIds.includes("intraoral_frontal_occlusion"));
		assert.ok(slotIds.includes("intraoral_right_buccal"));
		assert.ok(slotIds.includes("intraoral_left_buccal"));
		assert.ok(slotIds.includes("intraoral_maxillary_occlusal"));
		assert.ok(slotIds.includes("intraoral_mandibular_occlusal"));
		assert.ok(slotIds.includes("intraoral_overjet"));
	});

	it("2. Protocol registry retrieves presets by id with fallback", () => {
		assert.equal(CLINICAL_PROTOCOLS_REGISTRY.length, 5);

		const ortho = getPresetById("standard_12_ortho_aesthetic");
		assert.equal(ortho.id, "standard_12_ortho_aesthetic");
		assert.equal(ortho.totalSlots, 12);

		const aesthetic = getPresetById("aesthetic_8_prosthodontic");
		assert.equal(aesthetic.totalSlots, 8);

		const express = getPresetById("express_6_monitoring");
		assert.equal(express.totalSlots, 6);

		const therapy = getPresetById("minimal_3_therapy");
		assert.equal(therapy.totalSlots, 3);

		// Fallback test
		const fallback = getPresetById("unknown_preset");
		assert.equal(fallback.id, "standard_12_ortho_aesthetic");
	});

	it("3. Every slot definition provides SVG silhouette path and clinical checkpoints", () => {
		const frontal = getSlotDefinitionById("intraoral_frontal_occlusion");
		assert.ok(frontal);
		assert.equal(frontal?.category, "intraoral");
		assert.ok(frontal?.silhouetteSvgPath.length > 10);
		assert.ok(frontal?.clinicalCheckpointsRu.length >= 3);

		const portrait = getSlotDefinitionById("portrait_smile");
		assert.ok(portrait);
		assert.equal(portrait?.category, "extraoral");
		assert.ok(portrait?.silhouetteSvgPath.length > 10);
	});

	it("4. VITA shades catalog covers classical and bleach shades", () => {
		assert.ok(VITA_SHADES.includes("A1"));
		assert.ok(VITA_SHADES.includes("A2"));
		assert.ok(VITA_SHADES.includes("A3"));
		assert.ok(VITA_SHADES.includes("B1"));
		assert.ok(VITA_SHADES.includes("C2"));
		assert.ok(VITA_SHADES.includes("D3"));
		assert.ok(VITA_SHADES.includes("BL1"));
		assert.ok(VITA_SHADES.includes("BL4"));
		assert.equal(VITA_SHADES.length, 20);
	});

	it("5. 50/50 Comparison Slider math produces exact clip-path inset", () => {
		assert.equal(calculateComparisonClipPath(50), "inset(0 50% 0 0)");
		assert.equal(calculateComparisonClipPath(0), "inset(0 100% 0 0)");
		assert.equal(calculateComparisonClipPath(100), "inset(0 0% 0 0)");
		assert.equal(calculateComparisonClipPath(25), "inset(0 75% 0 0)");
		assert.equal(calculateComparisonClipPath(75), "inset(0 25% 0 0)");
		assert.equal(calculateComparisonClipPath(-10), "inset(0 100% 0 0)"); // Clamped
		assert.equal(calculateComparisonClipPath(150), "inset(0 0% 0 0)"); // Clamped
	});

	it("6. Generates statutory Form 043/u photo protocol summary text", () => {
		const text = formatChairsidePhotoProtocolDiaryRu(12, "Полный протокол 12 кадров", [11, 21, 22], "A2");
		assert.ok(text.includes("[ФОТОПРОТОКОЛ КРЕСЛА AACD/DSD]"));
		assert.ok(text.includes("Выполнено 12 снимков"));
		assert.ok(text.includes("Зубы: 11, 21, 22"));
		assert.ok(text.includes("Оттенок VITA: A2"));
	});
});
