/**
 * apps/web/src/components/orthodontics/__tests__/orthodonticsSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team Inquisition Test Suite for Orthodontics & Cephalometrics SSOT.
 * Verifies archwires (NiTi, CuNiTi, SS, TMA), elastics (Class II/III, forces), TRG Steiner/Tweed norms,
 * 1-click chairside activation presets, doctor autonomy (Mandate 8e), exactly ONE Primary CTA #0d9488 (Mandate 8am),
 * Apple HIG mobile ergonomics, and direct mounting in AppShell & StandaloneLaunchers (Mandate 8aq).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	ARCHWIRE_ALLOYS_SSOT,
	ARCHWIRE_SECTIONS_SSOT,
	ELASTICS_CATALOG,
	TRG_ANGLES_NORMS_SSOT,
	CHAIRSIDE_ACTIONS_CATALOG,
	ORTHO_ACTIVATION_PRESETS,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
} from "../orthodonticsCatalogData";
import { OrthodonticStudioModal } from "../OrthodonticStudioModal";
import { DirectOrthodonticsLauncher } from "../DirectOrthodonticsLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orthoDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(orthoDir, "../..");

describe("Orthodontics & Cephalometrics SSOT Invariants (Archwires, Elastics & TRG)", () => {
	it("1. Verifies 4 canonical archwire alloys are registered (NiTi, CuNiTi, SS, TMA)", () => {
		assert.equal(ARCHWIRE_ALLOYS_SSOT.length, 4, "Must contain exactly 4 canonical archwire alloys");
		const keys = ARCHWIRE_ALLOYS_SSOT.map((a) => a.key);
		assert.deepEqual(keys, ["niti", "cuniti", "ss", "tma"], "Alloys must match canonical keys");

		for (const alloy of ARCHWIRE_ALLOYS_SSOT) {
			assert.ok(alloy.label.length > 0, `Alloy ${alloy.key} must have full clinical label`);
			assert.ok(alloy.shortRu.length > 0, `Alloy ${alloy.key} must have short Russian name`);
			assert.ok(alloy.description.length > 0, `Alloy ${alloy.key} must have clinical description`);
		}
	});

	it("2. Verifies 7 standard archwire cross-sections with round and rectangular categorization", () => {
		assert.equal(ARCHWIRE_SECTIONS_SSOT.length, 7, "Must contain exactly 7 standard cross sections");

		const roundSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "round");
		const rectSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "rectangular");

		assert.equal(roundSections.length, 4, "Must contain 4 round sections (.012, .014, .016, .018)");
		assert.equal(rectSections.length, 3, "Must contain 3 rectangular sections (16×22, 17×25, 19×25)");

		assert.deepEqual(
			roundSections.map((s) => s.section),
			["0.012", "0.014", "0.016", "0.018"],
		);
		assert.deepEqual(
			rectSections.map((s) => s.section),
			["16x22", "17x25", "19x25"],
		);
	});

	it("3. Verifies intermaxillary elastics catalog with traction classes and force specifications", () => {
		assert.ok(ELASTICS_CATALOG.length >= 5, "Elastics catalog must contain all primary traction types");

		const class2 = ELASTICS_CATALOG.filter((e) => e.classType === "class_2");
		const class3 = ELASTICS_CATALOG.filter((e) => e.classType === "class_3");
		const triangular = ELASTICS_CATALOG.filter((e) => e.classType === "triangular");

		assert.ok(class2.length > 0, "Must have Class II elastics");
		assert.ok(class3.length > 0, "Must have Class III elastics");
		assert.ok(triangular.length > 0, "Must have Triangular elastics");

		for (const el of ELASTICS_CATALOG) {
			assert.ok(el.animalName.length > 0, `Elastic ${el.id} must have animal naming for patients`);
			assert.ok(el.hookSchemeRu.length > 0, `Elastic ${el.id} must have Russian hookup scheme`);
			assert.ok(el.forceOz.length > 0, `Elastic ${el.id} must have force in ounces`);
		}
	});

	it("4. Verifies canonical TRG angles (Steiner & Tweed) and tolerance thresholds", () => {
		assert.equal(TRG_ANGLES_NORMS_SSOT.length, 6, "Must contain exactly 6 key TRG reference angles");

		const keys = TRG_ANGLES_NORMS_SSOT.map((n) => n.key);
		assert.deepEqual(keys, ["sna", "snb", "anb", "u1_na", "l1_nb", "fma"]);

		const sna = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "sna")!;
		assert.equal(sna.normDeg, 82, "SNA norm must be 82°");

		const snb = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "snb")!;
		assert.equal(snb.normDeg, 80, "SNB norm must be 80°");

		const anb = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "anb")!;
		assert.equal(anb.normDeg, 2, "ANB norm must be 2°");

		const fma = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "fma")!;
		assert.equal(fma.normDeg, 25, "FMA norm must be 25° (Tweed)");
	});

	it("5. Verifies Skeletal Class calculation based on ANB angle (Штейнер)", () => {
		// Class I (0..4.5°)
		const class1 = calculateSkeletalClassFromAnb(2.0);
		assert.equal(class1.skeletalClass, "I");
		assert.ok(class1.labelRu.includes("I Скелетный"));

		// Class II (> 4.5°)
		const class2 = calculateSkeletalClassFromAnb(5.8);
		assert.equal(class2.skeletalClass, "II");
		assert.ok(class2.labelRu.includes("II Скелетный"));

		// Class III (< 0.0°)
		const class3 = calculateSkeletalClassFromAnb(-1.5);
		assert.equal(class3.skeletalClass, "III");
		assert.ok(class3.labelRu.includes("III Скелетный"));
	});

	it("6. Verifies evaluation of TRG angle deviations against clinical norms", () => {
		// Normal SNA (82° -> diff 0)
		const normSna = evaluateTrgAngleStatus("sna", 82.5);
		assert.equal(normSna.status, "normal");
		assert.equal(normSna.badgeLabelRu, "В норме");

		// High SNA (88° -> maxillary prognathism)
		const highSna = evaluateTrgAngleStatus("sna", 88.0);
		assert.equal(highSna.status, "deviation_high");
		assert.ok(highSna.badgeLabelRu.includes("+6° выше нормы"));

		// Low SNB (74° -> mandibular retrognathism)
		const lowSnb = evaluateTrgAngleStatus("snb", 74.0);
		assert.equal(lowSnb.status, "deviation_low");
		assert.ok(lowSnb.badgeLabelRu.includes("-6° ниже нормы"));
	});

	it("7. Verifies 1-click chairside presets and Mandate 8e autonomous state generation", () => {
		assert.equal(ORTHO_ACTIVATION_PRESETS.length, 5, "Must contain 5 chairside activation presets");

		const defaultState = createDefaultOrthoProtocolState();
		assert.ok(defaultState.applianceName.length > 0);
		assert.equal(defaultState.currentMonth, 6);
		assert.equal(defaultState.upperAlloy, "cuniti");
		assert.equal(defaultState.upperSection, "17x25");
		assert.ok(defaultState.selectedActionIds.length > 0);

		const soap = formatOrthoProtocolSoapEntry(defaultState);
		assert.ok(soap.includes("ПРОТОКОЛ АКТИВАЦИИ ОРТОДОНТИИ"), "SOAP must have clear clinical header");
		assert.ok(soap.includes("Дуга ВЧ:"), "SOAP must specify upper archwire");
		assert.ok(soap.includes("Дуга НЧ:"), "SOAP must specify lower archwire");
		assert.ok(soap.includes("Следующий визит через:"), "SOAP must specify interval");
	});
});

describe("Orthodontic Studio Modal & Launchers Architecture Inquisition", () => {
	it("8. Verifies orthodonticsCatalogData.ts lines Sweet Spot (250-350 lines)", () => {
		const filePath = path.join(orthoDir, "orthodonticsCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "orthodonticsCatalogData.ts must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 250 && lines <= 350,
			`orthodonticsCatalogData.ts must be in Sweet Spot 250-350 lines, was ${lines}`,
		);
	});

	it("9. Verifies OrthodonticStudioModal.tsx lines Sweet Spot (350-480 lines)", () => {
		const filePath = path.join(orthoDir, "OrthodonticStudioModal.tsx");
		assert.ok(fs.existsSync(filePath), "OrthodonticStudioModal.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 350 && lines <= 480,
			`OrthodonticStudioModal.tsx must be in Sweet Spot 350-480 lines, was ${lines}`,
		);
	});

	it("10. Verifies OrthodonticStudioModal has exactly ONE Primary CTA #0d9488 (Mandate 8am & 8e)", () => {
		const filePath = path.join(orthoDir, "OrthodonticStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		// Verifies data-testid attribute for reliable automation
		assert.ok(
			content.includes('data-testid="save-ortho-protocol-button"'),
			"Must have data-testid='save-ortho-protocol-button'",
		);

		// Verifies CTA is NEVER disabled (Mandate 8e Autonomy)
		assert.ok(
			!content.includes('disabled={'),
			"Primary CTA must NEVER be disabled in doctor chairside autonomy (Mandate 8e)",
		);

		// Verifies primary color #0d9488 / var(--teal)
		assert.ok(
			content.includes("var(--teal, #0d9488)"),
			"Primary CTA button must use canonical brand teal #0d9488",
		);
	});

	it("11. Verifies DirectOrthodonticsLauncher.tsx exists and <= 150 lines (Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "DirectOrthodonticsLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectOrthodonticsLauncher.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines <= 150,
			`DirectOrthodonticsLauncher.tsx must be <= 150 lines (Mandate 8b), was ${lines}`,
		);
	});

	it("12. Verifies DirectOrthodonticsLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
		const appShellPath = path.join(webSrcDir, "AppShell.tsx");
		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");

		const content = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			content.includes("DirectOrthodonticsLauncher"),
			"AppShell.tsx must import and render DirectOrthodonticsLauncher",
		);
		assert.ok(
			content.includes("<DirectOrthodonticsLauncher />"),
			"AppShell.tsx must mount <DirectOrthodonticsLauncher /> in component tree",
		);
	});

	it("13. Verifies DirectOrthodonticsLauncher is mounted in StandaloneLaunchers.tsx (Mandate 8aq)", () => {
		const launchersPath = path.join(
			webSrcDir,
			"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers.tsx must exist");

		const content = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(
			content.includes("DirectOrthodonticsLauncher"),
			"StandaloneLaunchers.tsx must import DirectOrthodonticsLauncher",
		);
		assert.ok(
			content.includes("orthodontics") && content.includes("ortho-protocol"),
			"StandaloneLaunchers.tsx must handle deep links #orthodontics and #ortho-protocol",
		);
	});

	it("14. Verifies SSR rendering of OrthodonticStudioModal without DOM errors", () => {
		const html = renderToString(
			<OrthodonticStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorName="Д-р Иванов"
			/>,
		);

		assert.ok(html.includes("Ортодонтическая студия &amp; Протокол активации"));
		assert.ok(html.includes("save-ortho-protocol-button"));
		assert.ok(html.includes("Тестовый Пациент"));
	});
});
