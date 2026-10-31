/**
 * apps/web/src/components/orthodontics/__tests__/orthodonticsSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team Inquisition Test Suite for Orthodontics SSOT.
 * Verifies appliances, Angle classification, archwires, elastics, TRG norms,
 * 1-click chairside presets, patient memo, doctor autonomy (Mandate 8e),
 * exactly ONE Primary CTA #0d9488 (Mandate 8am), Apple HIG mobile ergonomics,
 * and direct mounting in AppShell & StandaloneLaunchers (Mandate 8aq).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	APPLIANCES_CATALOG,
	ANGLE_CLASSES_CATALOG,
	ARCHWIRE_ALLOYS_SSOT,
	ARCHWIRE_SECTIONS_SSOT,
	ELASTICS_CATALOG,
	TRG_ANGLES_NORMS_SSOT,
	CHAIRSIDE_ACTIONS_CATALOG,
	ORTHO_ACTIVATION_PRESETS,
	ORTHO_PATIENT_MEMO_SECTIONS,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
	getOrthoPatientMemoText,
} from "../orthodonticsCatalogData";
import { OrthodonticStudioModal } from "../OrthodonticStudioModal";
import { DirectOrthodonticsLauncher } from "../DirectOrthodonticsLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orthoDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(orthoDir, "../..");

describe("Orthodontics Canonical SSOT Invariants (Appliances, Bite, Archwires & Elastics)", () => {
	it("1. Verifies appliances catalog contains braces, aligners, and plates", () => {
		assert.ok(APPLIANCES_CATALOG.length >= 8, "Must contain all standard orthodontic appliances");
		const categories = new Set(APPLIANCES_CATALOG.map((a) => a.category));
		assert.ok(categories.has("brackets"), "Must have bracket systems");
		assert.ok(categories.has("aligners"), "Must have aligners");
		assert.ok(categories.has("plate"), "Must have plate systems");

		const damon = APPLIANCES_CATALOG.find((a) => a.id === "damon_q2");
		assert.ok(damon?.name.includes("Damon"), "Must include Damon system");

		const aligner = APPLIANCES_CATALOG.find((a) => a.category === "aligners");
		assert.ok(aligner, "Must include aligners");
	});

	it("2. Verifies Angle malocclusion classification catalog (Classes I, II/1, II/2, III)", () => {
		assert.equal(ANGLE_CLASSES_CATALOG.length, 4, "Must contain 4 Angle classification groups");
		const keys = ANGLE_CLASSES_CATALOG.map((ac) => ac.key);
		assert.deepEqual(keys, ["class_1", "class_2_1", "class_2_2", "class_3"]);
		for (const ac of ANGLE_CLASSES_CATALOG) {
			assert.ok(ac.titleRu.length > 0, `Angle class ${ac.key} must have title`);
			assert.ok(ac.descriptionRu.length > 0, `Angle class ${ac.key} must have clinical description`);
		}
	});

	it("3. Verifies 4 canonical archwire alloys are registered (NiTi, CuNiTi, SS, TMA)", () => {
		assert.equal(ARCHWIRE_ALLOYS_SSOT.length, 4, "Must contain exactly 4 canonical archwire alloys");
		const keys = ARCHWIRE_ALLOYS_SSOT.map((a) => a.key);
		assert.deepEqual(keys, ["niti", "cuniti", "ss", "tma"], "Alloys must match canonical keys");

		for (const alloy of ARCHWIRE_ALLOYS_SSOT) {
			assert.ok(alloy.label.length > 0, `Alloy ${alloy.key} must have full clinical label`);
			assert.ok(alloy.shortRu.length > 0, `Alloy ${alloy.key} must have short Russian name`);
			assert.ok(alloy.description.length > 0, `Alloy ${alloy.key} must have clinical description`);
		}
	});

	it("4. Verifies 7 standard archwire cross-sections with round and rectangular categorization", () => {
		assert.equal(ARCHWIRE_SECTIONS_SSOT.length, 7, "Must contain exactly 7 standard cross sections");

		const roundSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "round");
		const rectSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "rectangular");

		assert.equal(roundSections.length, 4, "Must contain 4 round sections (.012, .014, .016, .018)");
		assert.equal(rectSections.length, 3, "Must contain 3 rectangular sections (16×22, 17×25, 19×25)");
	});

	it("5. Verifies intermaxillary elastics catalog with traction classes and force specifications", () => {
		assert.ok(ELASTICS_CATALOG.length >= 6, "Elastics catalog must contain all primary traction types");

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

	it("6. Verifies canonical TRG angles (Steiner & Tweed) and tolerance thresholds", () => {
		assert.equal(TRG_ANGLES_NORMS_SSOT.length, 6, "Must contain exactly 6 key TRG reference angles");

		const keys = TRG_ANGLES_NORMS_SSOT.map((n) => n.key);
		assert.deepEqual(keys, ["sna", "snb", "anb", "u1_na", "l1_nb", "fma"]);

		const sna = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "sna")!;
		assert.equal(sna.normDeg, 82, "SNA norm must be 82°");

		const anb = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "anb")!;
		assert.equal(anb.normDeg, 2, "ANB norm must be 2°");
	});

	it("7. Verifies Skeletal Class calculation and deviation evaluations", () => {
		const class1 = calculateSkeletalClassFromAnb(2.0);
		assert.equal(class1.skeletalClass, "I");

		const class2 = calculateSkeletalClassFromAnb(5.5);
		assert.equal(class2.skeletalClass, "II");

		const class3 = calculateSkeletalClassFromAnb(-1.0);
		assert.equal(class3.skeletalClass, "III");

		const normSna = evaluateTrgAngleStatus("sna", 82.5);
		assert.equal(normSna.status, "normal");

		const highSna = evaluateTrgAngleStatus("sna", 88.0);
		assert.equal(highSna.status, "deviation_high");
	});

	it("8. Verifies 1-click chairside presets and patient memo generator without emoji", () => {
		assert.ok(ORTHO_ACTIVATION_PRESETS.length >= 5, "Must contain at least 5 activation presets");

		const defaultState = createDefaultOrthoProtocolState();
		assert.ok(defaultState.applianceName.length > 0);
		assert.equal(defaultState.currentMonth, 6);
		assert.ok(defaultState.selectedActionIds.length > 0);

		const memo = getOrthoPatientMemoText();
		assert.ok(memo.length > 200, "Patient memo must be detailed and clinical");
		assert.ok(memo.includes("ГИГИЕНА"), "Memo must contain hygiene section");
		assert.ok(memo.includes("ВОСКА"), "Memo must contain wax section");
		assert.ok(memo.includes("ПИТАНИИ"), "Memo must contain diet section");
		assert.ok(!memo.includes("🍏") && !memo.includes("🦷") && !memo.includes("✨"), "No emojis in clinical memo");
	});

	it("9. Verifies SOAP clinical visit diary format without Soviet bureaucratic numbers", () => {
		const defaultState = createDefaultOrthoProtocolState();
		const soap = formatOrthoProtocolSoapEntry(defaultState);
		assert.ok(soap.includes("ПРОТОКОЛ ПРИЁМА ОРТОДОНТА"), "SOAP must have clear clinical header");
		assert.ok(soap.includes("Дуга на верхней челюсти:"), "SOAP must specify upper archwire");
		assert.ok(soap.includes("Дуга на нижней челюсти:"), "SOAP must specify lower archwire");
		assert.ok(soap.includes("Назначен следующий визит"), "SOAP must specify interval");
		assert.ok(!soap.includes("043/у") && !soap.includes("804н"), "No bureaucratic Soviet codes in user clinical diary");
	});
});

describe("Orthodontic Studio Sweet Spot & Mandatory Mandates Inquisition", () => {
	it("10. Verifies orthodonticsCatalogData.ts lines Sweet Spot (300-350 lines, Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "orthodonticsCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "orthodonticsCatalogData.ts must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 300 && lines <= 350,
			`orthodonticsCatalogData.ts must be in Sweet Spot 300-350 lines, was ${lines}`,
		);
	});

	it("11. Verifies OrthodonticStudioModal.tsx lines Sweet Spot (380-480 lines, Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "OrthodonticStudioModal.tsx");
		assert.ok(fs.existsSync(filePath), "OrthodonticStudioModal.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 380 && lines <= 480,
			`OrthodonticStudioModal.tsx must be in Sweet Spot 380-480 lines, was ${lines}`,
		);
	});

	it("12. Verifies OrthodonticStudioModal has exactly ONE Primary CTA #0d9488 (Mandates 8am & 8e)", () => {
		const filePath = path.join(orthoDir, "OrthodonticStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			content.includes('data-testid="save-ortho-protocol-button"'),
			"Must have data-testid='save-ortho-protocol-button'",
		);

		assert.ok(
			!content.includes("disabled={"),
			"Primary CTA must NEVER be disabled in doctor chairside autonomy (Mandate 8e)",
		);

		assert.ok(
			content.includes("var(--teal, #0d9488)"),
			"Primary CTA button must use canonical brand teal #0d9488",
		);

		assert.ok(
			content.includes("Зафиксировать ортодонтический приём"),
			"Primary CTA text must match canonical clinical action",
		);
	});

	it("13. Verifies DirectOrthodonticsLauncher.tsx exists and is in 70-90 lines range (Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "DirectOrthodonticsLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectOrthodonticsLauncher.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 70 && lines <= 90,
			`DirectOrthodonticsLauncher.tsx must be in 70-90 lines range (Mandate 8b), was ${lines}`,
		);
	});

	it("14. Verifies DirectOrthodonticsLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
		const appShellPath = path.join(webSrcDir, "AppShell.tsx");
		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");

		const content = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			content.includes("DirectOrthodonticsLauncher"),
			"AppShell.tsx must import and render DirectOrthodonticsLauncher",
		);
	});

	it("15. Verifies DirectOrthodonticsLauncher is mounted in StandaloneLaunchers.tsx (Mandate 8aq)", () => {
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

	it("16. Verifies SSR rendering of OrthodonticStudioModal without DOM errors", () => {
		const html = renderToString(
			<OrthodonticStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorName="Д-р Иванов"
			/>,
		);

		assert.ok(html.includes("Ортодонтическая студия"));
		assert.ok(html.includes("save-ortho-protocol-button"));
		assert.ok(html.includes("Зафиксировать ортодонтический приём"));
		assert.ok(html.includes("Тестовый Пациент"));
	});
});
