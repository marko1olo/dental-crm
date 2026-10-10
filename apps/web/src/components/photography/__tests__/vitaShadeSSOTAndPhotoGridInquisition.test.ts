import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	ALL_VITA_SHADES,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	getVitaShadeByCode,
	normalizeVitaShadeCode,
	calculateShadeDelta,
	colorDistanceDeltaE2000,
	colorDistanceDeltaE76,
	rgbToLab,
	labToRgb,
} from "../vitaShadesCatalog";

import {
	getStratificationPreset,
	STUMP_NATURAL_DIE_SHADES,
	SHADE_SWATCH_MAP,
	VITA_BLEACH_SHADES_CLASSIFIED,
} from "../../lab/labShadesData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrc = path.resolve(__dirname, "../../../");

describe("Red Team Inquisition: Dental Photography, VITA Scale SSOT & Patient Card Integration", () => {
	it("1. VITA Scale Catalog Completeness & Homoglyph Normalization SSOT", () => {
		// Exactly 20 Classical (16 standard + 4 bleach BL1-BL4)
		assert.strictEqual(VITA_CLASSICAL_SHADES.length, 20, "VITA Classical must contain 20 shades");
		// Exactly 29 3D-Master shades (0M1-0M3 bleach + groups 1..5)
		assert.strictEqual(VITA_3D_MASTER_SHADES.length, 29, "VITA 3D-Master must contain 29 shades");
		// Total 49 calibrated physical shades
		assert.strictEqual(ALL_VITA_SHADES.length, 49, "Total catalog must contain 49 calibrated physical shades");

		// Test Cyrillic homoglyph inputs (Russian keyboard typing by doctors)
		assert.strictEqual(normalizeVitaShadeCode("А2"), "A2", "Russian 'А' must normalize to Latin 'A'");
		assert.strictEqual(normalizeVitaShadeCode("В1"), "B1", "Russian 'В' must normalize to Latin 'B'");
		assert.strictEqual(normalizeVitaShadeCode("С3"), "C3", "Russian 'С' must normalize to Latin 'C'");
		assert.strictEqual(normalizeVitaShadeCode("Д2"), "D2", "Russian 'Д' must normalize to Latin 'D'");
		assert.strictEqual(normalizeVitaShadeCode("ОМ2"), "0M2", "Bleach alias OM2 must normalize to 0M2");
		assert.strictEqual(normalizeVitaShadeCode("vita  a-3.5 "), "A3.5", "Prefix and whitespace must normalize cleanly");
		assert.strictEqual(normalizeVitaShadeCode("3D-2М2"), "2M2", "Russian 'М' in 3D group must normalize to Latin 'M'");

		// Verify getVitaShadeByCode resolves Cyrillic codes
		const resolvedRussianA2 = getVitaShadeByCode("А2");
		assert.ok(resolvedRussianA2, "Russian 'А2' must resolve to VITA shade object");
		assert.strictEqual(resolvedRussianA2.code, "A2");

		const resolvedRussianOM1 = getVitaShadeByCode("ОМ1");
		assert.ok(resolvedRussianOM1, "Russian 'ОМ1' must resolve to 0M1");
		assert.strictEqual(resolvedRussianOM1.code, "0M1");
	});

	it("2. Colorimetry & CIEDE2000 Invariants (Zero NaN, Deterministic Metrics)", () => {
		const a3 = getVitaShadeByCode("A3")!;
		const bl2 = getVitaShadeByCode("BL2")!;

		const delta = calculateShadeDelta(a3, bl2);
		assert.ok(Number.isFinite(delta.deltaE00), "CIEDE2000 must be a finite number");
		assert.ok(Number.isFinite(delta.deltaL), "Delta L must be a finite number");
		assert.ok(delta.deltaL > 0, "Bleach BL2 must have higher lightness than A3");
		assert.strictEqual(delta.isLighter, true, "isLighter must be true when whitening");

		// Delta between identical shades must be 0
		const zeroDelta = calculateShadeDelta(a3, a3);
		assert.strictEqual(zeroDelta.deltaE00, 0, "Self Delta E must be 0");
		assert.strictEqual(zeroDelta.deltaL, 0, "Self Delta L must be 0");

		// Round-trip sRGB <-> CIELAB conversion test
		const sampleRgb = { r: 234, g: 218, b: 192 };
		const lab = rgbToLab(sampleRgb);
		const roundtripRgb = labToRgb(lab);
		assert.ok(Math.abs(roundtripRgb.r - sampleRgb.r) <= 1, "R channel roundtrip tolerance <= 1");
		assert.ok(Math.abs(roundtripRgb.g - sampleRgb.g) <= 1, "G channel roundtrip tolerance <= 1");
		assert.ok(Math.abs(roundtripRgb.b - sampleRgb.b) <= 1, "B channel roundtrip tolerance <= 1");
	});

	it("3. 3-Zone Stratification Presets & IPS Natural Die Stump Scale SSOT", () => {
		// Natural stratification gradient
		const stratA2 = getStratificationPreset("A2", "natural");
		assert.strictEqual(stratA2.cervical, "A3", "A2 natural cervical must be A3 (warmer)");
		assert.strictEqual(stratA2.body, "A2", "A2 body must be primary shade A2");
		assert.strictEqual(stratA2.incisal, "A1", "A2 natural incisal must be A1 (lighter)");

		// Monochrome preset
		const monoA3 = getStratificationPreset("A3", "monochrome");
		assert.strictEqual(monoA3.cervical, "A3");
		assert.strictEqual(monoA3.body, "A3");
		assert.strictEqual(monoA3.incisal, "A3");

		// Youth translucent preset
		const youthA2 = getStratificationPreset("A2", "youth_translucent");
		assert.strictEqual(youthA2.cervical, "A2");
		assert.strictEqual(youthA2.body, "A2");
		assert.strictEqual(youthA2.incisal, "A1");

		// Stump ND1-ND9 completeness
		assert.strictEqual(STUMP_NATURAL_DIE_SHADES.length, 9, "Stump scale must have 9 ND shades (ND1-ND9)");
		assert.ok(SHADE_SWATCH_MAP["ND1"], "ND1 swatch must exist");
		assert.ok(SHADE_SWATCH_MAP["ND9"], "ND9 swatch must exist");
	});

	it("4. Anti-Monolith Law (Mandate 8c & §18): All components <= 800 lines", () => {
		const filesToCheck = [
			"components/photography/ClinicalPhotoProtocolModal.tsx",
			"components/photography/BeforeAfterComparisonView.tsx",
			"components/photography/VitaShadeSelector.tsx",
			"components/photography/vitaShadesCatalog.ts",
			"components/photography/photoProtocolEngine.ts",
			"components/photography/photoGridPresets.ts",
			"components/photography/PhotoSlotCard.tsx",
			"components/diagnostics/OrthodonticPhotoProtocolModal.tsx",
			"components/patients/PatientWorkspaceModals.tsx",
		];

		for (const rel of filesToCheck) {
			const absPath = path.resolve(webSrc, rel);
			assert.ok(fs.existsSync(absPath), `File must exist: ${rel}`);
			const content = fs.readFileSync(absPath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${rel} must NOT exceed 800 lines (actual: ${lineCount})`,
			);
		}
	});

	it("5. Doctor Autonomy (Mandate 8e): Zero disabled buttons in photography components", () => {
		const photoFiles = [
			"components/photography/ClinicalPhotoProtocolModal.tsx",
			"components/photography/BeforeAfterComparisonView.tsx",
			"components/photography/VitaShadeSelector.tsx",
			"components/photography/PhotoSlotCard.tsx",
			"components/diagnostics/OrthodonticPhotoProtocolModal.tsx",
		];

		const disabledRegex = /disabled=\{/i;
		const disabledAttrRegex = /\sdisabled(\s|>)/i;

		for (const rel of photoFiles) {
			const absPath = path.resolve(webSrc, rel);
			const content = fs.readFileSync(absPath, "utf-8");

			const hasDisabledProp = disabledRegex.test(content) || disabledAttrRegex.test(content);
			assert.strictEqual(
				hasDisabledProp,
				false,
				`Doctor Autonomy Violation: ${rel} contains disabled buttons!`,
			);
		}
	});

	it("6. Zero Cartoon Emojis (Mandate 8d item 7) in Photography & VITA modules", () => {
		const files = [
			"components/photography/ClinicalPhotoProtocolModal.tsx",
			"components/photography/BeforeAfterComparisonView.tsx",
			"components/photography/VitaShadeSelector.tsx",
			"components/photography/vitaShadesCatalog.ts",
			"components/photography/photoProtocolEngine.ts",
			"components/diagnostics/OrthodonticPhotoProtocolModal.tsx",
		];

		// Matches common emojis range excluding standard clinical ASCII / text
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

		for (const rel of files) {
			const absPath = path.resolve(webSrc, rel);
			const content = fs.readFileSync(absPath, "utf-8");
			assert.strictEqual(
				emojiRegex.test(content),
				false,
				`Mandate 8d Item 7 Violation: Cartoon emojis found in ${rel}`,
			);
		}
	});

	it("7. Patient Card Integration: Photo Protocol Modals wired into PatientWorkspaceView", () => {
		const workspacePath = path.resolve(webSrc, "components/patients/PatientWorkspaceView.tsx");
		const modalsPath = path.resolve(webSrc, "components/patients/PatientWorkspaceModals.tsx");

		const workspaceContent = fs.readFileSync(workspacePath, "utf-8");
		const modalsContent = fs.readFileSync(modalsPath, "utf-8");

		const toolbarPath = path.resolve(webSrc, "components/patients/workspaceView/PatientWorkspaceToolbar.tsx");
		const scansTabPath = path.resolve(webSrc, "components/patients/workspaceView/PatientWorkspaceScansTab.tsx");
		const workspaceCombinedContent = [
			workspaceContent,
			fs.existsSync(toolbarPath) ? fs.readFileSync(toolbarPath, "utf-8") : "",
			fs.existsSync(scansTabPath) ? fs.readFileSync(scansTabPath, "utf-8") : "",
		].join("\n");

		// Proves PatientWorkspaceModals imports and renders ClinicalPhotoProtocolModal & OrthodonticPhotoProtocolModal
		assert.ok(
			modalsContent.includes("ClinicalPhotoProtocolModal"),
			"PatientWorkspaceModals must import ClinicalPhotoProtocolModal",
		);
		assert.ok(
			modalsContent.includes("OrthodonticPhotoProtocolModal"),
			"PatientWorkspaceModals must import OrthodonticPhotoProtocolModal",
		);

		// Proves PatientWorkspaceView has 1-click action triggers
		assert.ok(
			workspaceCombinedContent.includes("patient-workspace-open-photo-protocol-btn"),
			"PatientWorkspaceView dropdown menu must contain photo protocol button",
		);
		assert.ok(
			workspaceCombinedContent.includes("patient-workspace-open-ortho-photo-btn"),
			"PatientWorkspaceView dropdown menu must contain ortho photo button",
		);
		assert.ok(
			workspaceCombinedContent.includes("btn-patient-open-photo-protocol"),
			"PatientWorkspaceView scans tab must contain 1-click photo protocol button",
		);
	});
});
