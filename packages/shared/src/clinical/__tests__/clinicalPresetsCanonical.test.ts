/**
 * packages/shared/src/clinical/__tests__/clinicalPresetsCanonical.test.ts
 *
 * Comprehensive Test Suite for Canonical Clinical Presets & Bundles (SSOT).
 * Mandates: 8b, 8e, 8x, 8ap, 8v, 8d item 7.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	THERAPY_SOAP_PRESETS,
	SURGERY_SOAP_PRESETS,
	AUTOPILOT_CARIES_K021,
	AUTOPILOT_NORM_HEALTHY,
	AUTOPILOT_EXTRACTION_K045,
	AUTOPILOT_EXTRACTION_K011,
	AUTOPILOT_EXTRACTION_COMPLEX_K011,
	therapyBundles,
	surgeryBundles,
	THERAPY_COPILOT_PRESETS,
	getAllCanonicalSoapPresets,
	findTherapySoapPresetById,
	findSurgerySoapPresetById,
	findCanonicalPresetById,
	findClinicalBundleById,
} from "../presets/index.js";

describe("Canonical Clinical Presets & Procedure Bundles (SSOT)", () => {
	it("THERAPY_SOAP_PRESETS contains all canonical therapy & endodontic protocols", () => {
		assert.ok(Array.isArray(THERAPY_SOAP_PRESETS), "THERAPY_SOAP_PRESETS must be an array");
		assert.ok(THERAPY_SOAP_PRESETS.length >= 15, `Expected >= 15 presets, got ${THERAPY_SOAP_PRESETS.length}`);

		const ids = THERAPY_SOAP_PRESETS.map((p) => p.id);
		assert.ok(ids.includes("norm_healthy"), "Should include norm_healthy (Z01.2)");
		assert.ok(ids.includes("caries_medium"), "Should include caries_medium (K02.1)");
		assert.ok(ids.includes("pulpitis_visit1"), "Should include pulpitis_visit1 (K04.0)");
		assert.ok(ids.includes("pulpitis_obturation"), "Should include pulpitis_obturation (K04.0)");
		assert.ok(ids.includes("periodontitis_destructive"), "Should include periodontitis_destructive (K04.5)");
		assert.ok(ids.includes("caries_initial_icon"), "Should include caries_initial_icon (K02.0)");
		assert.ok(ids.includes("wedge_defect_cervical"), "Should include wedge_defect_cervical (K03.1)");
	});

	it("SURGERY_SOAP_PRESETS contains all canonical surgery protocols", () => {
		assert.ok(Array.isArray(SURGERY_SOAP_PRESETS), "SURGERY_SOAP_PRESETS must be an array");
		assert.ok(SURGERY_SOAP_PRESETS.length >= 7, `Expected >= 7 presets, got ${SURGERY_SOAP_PRESETS.length}`);

		const ids = SURGERY_SOAP_PRESETS.map((p) => p.id);
		assert.ok(ids.includes("surgery_extraction_simple"), "Should include simple extraction");
		assert.ok(ids.includes("surgery_extraction_complex"), "Should include complex extraction");
		assert.ok(ids.includes("surgery_periostotomy"), "Should include periostotomy");
		assert.ok(ids.includes("implant_healing_abutment"), "Should include healing abutment");
		assert.ok(ids.includes("surgery_implant_standard"), "Should include implant placement");
		assert.ok(ids.includes("surgery_norm_checkup"), "Should include surgery norm checkup");
		assert.ok(ids.includes("surgery_cystectomy_rvk"), "Should include cystectomy RVK");
	});

	it("Doctor Autopilot Presets satisfy Mandate 8e (1-click autonomy, zero friction)", () => {
		assert.equal(AUTOPILOT_CARIES_K021.is1ClickAutopilot, true);
		assert.equal(AUTOPILOT_NORM_HEALTHY.is1ClickAutopilot, true);
		assert.equal(AUTOPILOT_EXTRACTION_K045.is1ClickAutopilot, true);
		assert.equal(AUTOPILOT_EXTRACTION_K011.is1ClickAutopilot, true);
		assert.equal(AUTOPILOT_EXTRACTION_COMPLEX_K011.is1ClickAutopilot, true);

		// Autopilot presets must have non-empty complaint, anamnesis, statusLocalis, treatmentDescription
		for (const autoPreset of [
			AUTOPILOT_CARIES_K021,
			AUTOPILOT_NORM_HEALTHY,
			AUTOPILOT_EXTRACTION_K045,
			AUTOPILOT_EXTRACTION_COMPLEX_K011,
		]) {
			assert.ok(autoPreset.complaint.length > 5, `${autoPreset.id} complaint too short`);
			assert.ok(autoPreset.anamnesis.length > 5, `${autoPreset.id} anamnesis too short`);
			assert.ok(autoPreset.statusLocalis.length > 5, `${autoPreset.id} statusLocalis too short`);
			assert.ok(autoPreset.treatmentDescription.length > 5, `${autoPreset.id} treatment too short`);
		}
	});

	it("Clinical Bundles have integer kopecks without float drift", () => {
		assert.ok(therapyBundles.length >= 4, "Must have at least 4 therapy bundles");
		assert.ok(surgeryBundles.length >= 3, "Must have at least 3 surgery bundles");

		for (const bundleDef of [...therapyBundles, ...surgeryBundles]) {
			assert.ok(bundleDef.totalPriceRub > 0, `Bundle ${bundleDef.id} price must be > 0`);
			assert.equal(typeof bundleDef.totalPriceKopecks, "number", `Bundle ${bundleDef.id} kopecks must be number`);
			assert.equal(
				bundleDef.totalPriceKopecks,
				bundleDef.totalPriceRub * 100,
				`Bundle ${bundleDef.id} kopecks mismatch`,
			);
			assert.ok(bundleDef.items.length > 0, `Bundle ${bundleDef.id} must have items`);
			for (const itemDef of bundleDef.items) {
				assert.equal(typeof itemDef.defaultPriceKopecks, "number");
				assert.equal(itemDef.defaultPriceKopecks, itemDef.defaultPriceRub * 100);
			}
		}
	});

	it("Chairside Copilot Presets have valid FDI tooth notation and structured thoughts", () => {
		assert.ok(THERAPY_COPILOT_PRESETS.length >= 2, "Must have at least 2 copilot presets");
		for (const cp of THERAPY_COPILOT_PRESETS) {
			assert.ok(cp.toothNumber >= 11 && cp.toothNumber <= 48, `Invalid FDI tooth number ${cp.toothNumber}`);
			assert.ok(cp.services.length > 0, "Copilot preset must have services");
			assert.ok(cp.soap.diagnosis.length > 0, "Copilot preset must have diagnosis");
		}
	});

	it("Lookup helper functions locate presets and bundles correctly", () => {
		const allPresets = getAllCanonicalSoapPresets();
		assert.equal(allPresets.length, THERAPY_SOAP_PRESETS.length + SURGERY_SOAP_PRESETS.length);

		const caries = findTherapySoapPresetById("caries_medium");
		assert.ok(caries);
		assert.equal(caries?.id, "caries_medium");

		const surgery = findSurgerySoapPresetById("surgery_extraction_simple");
		assert.ok(surgery);
		assert.equal(surgery?.id, "surgery_extraction_simple");

		const canonical = findCanonicalPresetById("norm_healthy");
		assert.ok(canonical);
		assert.equal(canonical?.id, "norm_healthy");

		const bnd = findClinicalBundleById("caries_turnkey");
		assert.ok(bnd);
		assert.equal(bnd?.id, "caries_turnkey");
	});

	it("Zero cartoon emojis in clinical record texts (Mandate 8d item 7)", () => {
		const cartoonEmojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
		const allPresets = getAllCanonicalSoapPresets();
		for (const p of allPresets) {
			assert.ok(!cartoonEmojiRegex.test(p.title), `Title has emoji in ${p.id}`);
			assert.ok(!cartoonEmojiRegex.test(p.shortBadge), `Badge has emoji in ${p.id}`);
			assert.ok(!cartoonEmojiRegex.test(p.complaint), `Complaint has emoji in ${p.id}`);
			assert.ok(!cartoonEmojiRegex.test(p.treatmentDescription), `Treatment has emoji in ${p.id}`);
		}
	});
});
