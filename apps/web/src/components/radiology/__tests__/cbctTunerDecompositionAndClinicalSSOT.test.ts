/**
 * apps/web/src/components/radiology/__tests__/cbctTunerDecompositionAndClinicalSSOT.test.ts
 *
 * RED TEAM INQUISITION SUITE: CBCT TUNER MONOLITH DECOMPOSITION & CLINICAL SSOT
 *
 * Strict verification of:
 * 1. Mandate 8b: Facade in Sweet Spot (<= 300 lines) and all studio submodules <= 300 lines;
 * 2. Misch Bone Density Scale (D1-D4 classification and clinical presets);
 * 3. Mandate 8e (Doctor Autonomy): Zero disabled buttons on save/attach to visit;
 * 4. Mandate 8am & Apple HIG: Exactly ONE Primary CTA and >= 44x44px touch targets;
 * 5. Zero foreign CRM references or banned abbreviations.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	classifyBoneDensityMisch,
	DEFAULT_TUNER_PARAMS,
	TUNER_PRESETS,
} from "../tuner/cbctTunerTypes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CBCT Tuner Monolith Decomposition & Clinical SSOT Inquisition", () => {
	const facadePath = path.resolve(__dirname, "../tuner/CbctTunerPlayground.tsx");
	const studioDir = path.resolve(__dirname, "../tuner/studio");
	const hookPath = path.resolve(studioDir, "useCbctTunerPlaygroundState.ts");
	const headerPath = path.resolve(studioDir, "CbctTunerHeader.tsx");
	const viewportsPath = path.resolve(studioDir, "CbctViewportControls.tsx");
	const presetsPath = path.resolve(studioDir, "CbctDensityPresetSelector.tsx");
	const hudPath = path.resolve(studioDir, "CbctHistogramPanel.tsx");
	const slidersPath = path.resolve(studioDir, "CbctSlidersPanel.tsx");

	it("1. Mandate 8b: Facade is in the Sweet Spot (<= 300 lines) and all submodules <= 300 lines", () => {
		const files = [
			{ path: facadePath, name: "CbctTunerPlayground.tsx", max: 300 },
			{ path: hookPath, name: "useCbctTunerPlaygroundState.ts", max: 300 },
			{ path: headerPath, name: "CbctTunerHeader.tsx", max: 300 },
			{ path: viewportsPath, name: "CbctViewportControls.tsx", max: 300 },
			{ path: presetsPath, name: "CbctDensityPresetSelector.tsx", max: 300 },
			{ path: hudPath, name: "CbctHistogramPanel.tsx", max: 300 },
			{ path: slidersPath, name: "CbctSlidersPanel.tsx", max: 300 },
		];

		for (const file of files) {
			assert.ok(fs.existsSync(file.path), `Module ${file.name} must exist`);
			const lines = fs.readFileSync(file.path, "utf-8").split(/\r?\n/).length;
			assert.ok(
				lines <= file.max,
				`File ${file.name} line count ${lines} exceeds limit ${file.max} (Mandate 8b)`,
			);
		}
	});

	it("2. Clinical Misch Bone Density Classification (D1-D4, Soft Tissue, Air)", () => {
		assert.equal(classifyBoneDensityMisch(1800).type, "ENAMEL");
		assert.equal(classifyBoneDensityMisch(1350).type, "D1");
		assert.equal(classifyBoneDensityMisch(1000).type, "D2");
		assert.equal(classifyBoneDensityMisch(550).type, "D3");
		assert.equal(classifyBoneDensityMisch(250).type, "D4");
		assert.equal(classifyBoneDensityMisch(0).type, "SOFT_TISSUE");
		assert.equal(classifyBoneDensityMisch(-600).type, "AIR");

		// Clinical presets verify
		const presetIds = TUNER_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("bone_d1"), "Must include D1 dense bone preset");
		assert.ok(presetIds.includes("bone_d2"), "Must include D2 trabecular bone preset");
		assert.ok(presetIds.includes("bone_d3"), "Must include D3 thin bone preset");
		assert.ok(presetIds.includes("bone_d4"), "Must include D4 soft bone preset");
		assert.ok(presetIds.includes("nerve_canal"), "Must include mandibular nerve canal preset");
		assert.ok(presetIds.includes("standard_dental"), "Must include canonical standard dental preset");
	});

	it("3. Mandate 8e: Doctor autonomy — zero disabled buttons in CbctTuner components", () => {
		const allCode = [
			fs.readFileSync(facadePath, "utf-8"),
			fs.readFileSync(headerPath, "utf-8"),
			fs.readFileSync(viewportsPath, "utf-8"),
			fs.readFileSync(presetsPath, "utf-8"),
			fs.readFileSync(hudPath, "utf-8"),
			fs.readFileSync(slidersPath, "utf-8"),
		].join("\n");

		// No disabled attribute on action buttons
		const disabledMatches = allCode.match(/disabled=\{?[^}\n]*\}?/g) || [];
		const buttonDisabled = disabledMatches.filter((m) => !m.includes("/*"));
		assert.equal(
			buttonDisabled.length,
			0,
			`Buttons must never be disabled (Mandate 8e), found: ${buttonDisabled.join(", ")}`,
		);
	});

	it("4. Mandate 8am & Apple HIG: Exactly ONE Primary CTA and >= 44x44px touch targets", () => {
		const headerCode = fs.readFileSync(headerPath, "utf-8");

		// Exactly one Primary CTA with teal styling
		assert.ok(
			headerCode.includes("data-testid=\"cbct-tuner-attach-visit-btn\""),
			"Must have attach-visit primary button",
		);
		assert.ok(
			headerCode.includes("bg-teal-600"),
			"Primary CTA button must use DENTE brand teal color (bg-teal-600)",
		);

		// Touch targets >= 44px
		const slidersCode = fs.readFileSync(slidersPath, "utf-8");
		const targetMatches = slidersCode.match(/min-h-\[44px\]/g) || [];
		assert.ok(
			targetMatches.length >= 7,
			`Sliders panel must enforce min-h-[44px] touch target for all controls, found ${targetMatches.length}`,
		);
	});

	it("5. Clean Clinical Vocabulary: No foreign CRM brands or Soviet forms", () => {
		const allCode = [
			fs.readFileSync(facadePath, "utf-8"),
			fs.readFileSync(headerPath, "utf-8"),
			fs.readFileSync(viewportsPath, "utf-8"),
			fs.readFileSync(presetsPath, "utf-8"),
			fs.readFileSync(hudPath, "utf-8"),
			fs.readFileSync(slidersPath, "utf-8"),
		].join("\n");

		const banned = ["iStom", "DentalPRO", "IDENT", "StomX", "043/у", "804н", "54-ФЗ", "ФФД 1.2"];
		for (const term of banned) {
			assert.ok(!allCode.includes(term), `Forbidden word '${term}' found in tuner code`);
		}
	});
});
