/**
 * apps/web/src/components/orthodontics/__tests__/orthodonticsStudioSSOT.test.tsx
 *
 * DENTE Dental CRM — Canonical Red Team Inquisition Test Suite for Orthodontics Studio SSOT.
 * Verifies aligner stage tracking (step X of Y, wear schedule), bracket system activation
 * (archwire alloys NiTi/CuNiTi/SS/TMA, sections, intermaxillary elastics), clinical photo protocol
 * (6 canonical views), TRG cephalometrics (SNA, SNB, ANB skeletal class), doctor autonomy (Mandate 8e),
 * exactly ONE Primary CTA #0d9488 (Mandate 8am), Sweet Spot file sizes (Mandate 8b),
 * Apple HIG mobile ergonomics, and direct UI mounting in AppShell & StandaloneLaunchers (Mandate 8aq).
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
	ORTHO_PHOTO_SLOTS_SSOT,
	ORTHO_PATIENT_MEMO_SECTIONS,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
	getOrthoPatientMemoText,
} from "../orthodonticsCatalogData";
import { OrthodonticsStudioModal } from "../OrthodonticsStudioModal";
import { DirectOrthodonticsLauncher } from "../DirectOrthodonticsLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orthoDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(orthoDir, "../..");

describe("Orthodontics Studio SSOT Invariants (Aligners, Braces, Photo Protocol & TRG)", () => {
	it("1. Verifies appliances catalog includes aligners, self-ligating brackets and expanders", () => {
		assert.ok(APPLIANCES_CATALOG.length >= 8, "Must contain all standard orthodontic appliances");
		const categories = new Set(APPLIANCES_CATALOG.map((a) => a.category));
		assert.ok(categories.has("brackets"), "Must have bracket systems");
		assert.ok(categories.has("aligners"), "Must have aligners");
		assert.ok(categories.has("plate"), "Must have plate systems");

		const flexiligner = APPLIANCES_CATALOG.find((a) => a.id === "flexiligner");
		assert.ok(flexiligner, "Must include FlexiLigner aligner system");
		const damon = APPLIANCES_CATALOG.find((a) => a.id === "damon_q2");
		assert.ok(damon, "Must include Damon bracket system");
	});

	it("2. Verifies aligner stage tracking structure and defaults", () => {
		const state = createDefaultOrthoProtocolState();
		assert.ok(state.alignerTracking, "Must have alignerTracking state");
		assert.equal(state.alignerTracking.currentStep, 6, "Default step must be 6");
		assert.equal(state.alignerTracking.totalSteps, 24, "Default total steps must be 24");
		assert.equal(state.alignerTracking.wearDaysPerStep, 14, "Default wear schedule must be 14 days per step");
		assert.ok(state.alignerTracking.issuedSetsCount >= 1, "Must track issued aligner sets count");
		assert.ok(state.alignerTracking.nextPlannedDate.length > 0, "Must calculate next planned set switch date");
		assert.equal(state.alignerTracking.iprCompleted, true, "Must track IPR status");
		assert.equal(state.alignerTracking.attachmentsVerified, true, "Must track attachments status");
	});

	it("3. Verifies clinical photo protocol catalog (6 canonical projections)", () => {
		assert.equal(ORTHO_PHOTO_SLOTS_SSOT.length, 6, "Must define exactly 6 canonical photo protocol slots");
		const ids = ORTHO_PHOTO_SLOTS_SSOT.map((s) => s.id);
		assert.deepEqual(ids, [
			"frontal_rest",
			"frontal_smile",
			"profile",
			"occlusion_right",
			"occlusion_center",
			"occlusion_left",
		]);

		const portraits = ORTHO_PHOTO_SLOTS_SSOT.filter((s) => s.category === "portrait");
		const intraoral = ORTHO_PHOTO_SLOTS_SSOT.filter((s) => s.category === "intraoral");
		assert.equal(portraits.length, 3, "Must have 3 portrait photos (rest, smile, profile)");
		assert.equal(intraoral.length, 3, "Must have 3 intraoral photos (right, center, left)");
	});

	it("4. Verifies Angle classification & Skeletal Class calculation from ANB angle", () => {
		assert.equal(ANGLE_CLASSES_CATALOG.length, 4, "Must contain 4 Angle groups");

		const class1 = calculateSkeletalClassFromAnb(2.1);
		assert.equal(class1.skeletalClass, "I", "ANB 2.1° is Class I");

		const class2 = calculateSkeletalClassFromAnb(5.2);
		assert.equal(class2.skeletalClass, "II", "ANB 5.2° is Class II distal");

		const class3 = calculateSkeletalClassFromAnb(-1.5);
		assert.equal(class3.skeletalClass, "III", "ANB -1.5° is Class III mesial");
	});

	it("5. Verifies 4 canonical archwire alloys and 7 cross sections", () => {
		assert.equal(ARCHWIRE_ALLOYS_SSOT.length, 4, "Must contain exactly 4 archwire alloys");
		const alloys = ARCHWIRE_ALLOYS_SSOT.map((a) => a.key);
		assert.deepEqual(alloys, ["niti", "cuniti", "ss", "tma"]);

		assert.equal(ARCHWIRE_SECTIONS_SSOT.length, 7, "Must contain 7 cross sections");
		const round = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "round");
		const rect = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "rectangular");
		assert.equal(round.length, 4, "4 round sections");
		assert.equal(rect.length, 3, "3 rectangular sections");
	});

	it("6. Verifies intermaxillary elastics catalog with traction classes and animal names", () => {
		assert.ok(ELASTICS_CATALOG.length >= 6, "Must contain all standard elastics");
		for (const el of ELASTICS_CATALOG) {
			assert.ok(el.animalName.length > 0, "Must have animal name");
			assert.ok(el.hookSchemeRu.length > 0, "Must have hookup scheme");
			assert.ok(el.forceOz.length > 0, "Must have force specification");
		}
	});

	it("7. Verifies Steiner & Tweed TRG norms evaluation", () => {
		assert.equal(TRG_ANGLES_NORMS_SSOT.length, 6, "Must define 6 canonical TRG angles");

		const snaEval = evaluateTrgAngleStatus("sna", 82.0);
		assert.equal(snaEval.status, "normal");

		const snbEval = evaluateTrgAngleStatus("snb", 76.0);
		assert.equal(snbEval.status, "deviation_low");

		const anbEval = evaluateTrgAngleStatus("anb", 5.5);
		assert.equal(anbEval.status, "deviation_high");
	});

	it("8. Verifies 1-click chairside presets and SOAP clinical protocol formatting", () => {
		assert.ok(ORTHO_ACTIVATION_PRESETS.length >= 5, "Must have chairside presets");

		const defaultState = createDefaultOrthoProtocolState();
		const soap = formatOrthoProtocolSoapEntry(defaultState);
		assert.ok(soap.includes("ПРОТОКОЛ ПРИЁМА ОРТОДОНТА"), "SOAP must have clear header");
		assert.ok(soap.includes("Диагноз окклюзии:"), "SOAP must include occlusion diagnosis");
		assert.ok(!soap.includes("043/у") && !soap.includes("804н"), "No Soviet bureaucratic jargon");
	});

	it("9. Verifies patient memo generator without emoji", () => {
		const memo = getOrthoPatientMemoText();
		assert.ok(memo.length > 200, "Memo must be comprehensive");
		assert.ok(memo.includes("ГИГИЕНА"), "Must contain hygiene rules");
		assert.ok(memo.includes("ВОСКА"), "Must contain wax guidance");
		assert.ok(!memo.includes("🦷") && !memo.includes("🍏"), "Strictly no emoji in patient memo");
	});
});

describe("Orthodontics Studio Architecture & File Limit Sweet Spot Inquisition", () => {
	it("10. Verifies orthodonticsCatalogData.ts lines Sweet Spot (300-380 lines, Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "orthodonticsCatalogData.ts");
		assert.ok(fs.existsSync(filePath), "orthodonticsCatalogData.ts must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 300 && lines <= 380,
			`orthodonticsCatalogData.ts must be in Sweet Spot 300-380 lines, was ${lines}`,
		);
	});

	it("11. Verifies OrthodonticsStudioModal.tsx lines Sweet Spot (400-480 lines, Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		assert.ok(fs.existsSync(filePath), "OrthodonticsStudioModal.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 400 && lines <= 480,
			`OrthodonticsStudioModal.tsx must be in Sweet Spot 400-480 lines, was ${lines}`,
		);
	});

	it("12. Verifies styles/orthodonticsStudio.css lines Sweet Spot (250-350 lines, Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "styles/orthodonticsStudio.css");
		assert.ok(fs.existsSync(filePath), "styles/orthodonticsStudio.css must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 250 && lines <= 350,
			`styles/orthodonticsStudio.css must be in Sweet Spot 250-350 lines, was ${lines}`,
		);
	});

	it("13. Verifies DirectOrthodonticsLauncher.tsx exists and is in 60-80 lines range (Mandate 8b)", () => {
		const filePath = path.join(orthoDir, "DirectOrthodonticsLauncher.tsx");
		assert.ok(fs.existsSync(filePath), "DirectOrthodonticsLauncher.tsx must exist");

		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 60 && lines <= 80,
			`DirectOrthodonticsLauncher.tsx must be in 60-80 lines range, was ${lines}`,
		);
	});

	it("14. Verifies doctor autonomy (Mandate 8e): 0 disabled buttons in OrthodonticsStudioModal", () => {
		const filePath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("disabled={"),
			"Primary CTA must NEVER be disabled in doctor chairside autonomy (Mandate 8e)",
		);
	});

	it("15. Verifies exactly ONE Primary CTA button with brand teal #0d9488 (Mandates 8am & 8e)", () => {
		const filePath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			content.includes('data-testid="save-ortho-protocol-button"'),
			"Must have data-testid='save-ortho-protocol-button'",
		);

		assert.ok(
			content.includes("var(--teal, #0d9488)") || content.includes("#0d9488"),
			"Primary CTA must use brand teal #0d9488",
		);

		assert.ok(
			content.includes("✓ Зафиксировать активацию этапа"),
			"Primary CTA text must match canonical clinical action",
		);
	});

	it("16. Verifies Apple HIG mobile touch ergonomics (>= 44x44px, bottom sheet, 0px horizontal scroll)", () => {
		const cssPath = path.join(orthoDir, "styles/orthodonticsStudio.css");
		const css = fs.readFileSync(cssPath, "utf-8");

		assert.ok(css.includes("border-top-left-radius: 24px"), "Mobile modal must have rounded-t-[24px]");
		assert.ok(css.includes("ortho-drag-handle"), "Must contain drag handle for mobile sheet");
		assert.ok(css.includes("min-height: 44px") || css.includes("min-height: 48px"), "Touch targets >= 44px");
		assert.ok(css.includes("overflow-x: clip"), "0px parasitic horizontal scroll");
	});

	it("17. Verifies DirectOrthodonticsLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
		const appShellPath = path.join(webSrcDir, "AppShell.tsx");
		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");

		const content = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			content.includes("DirectOrthodonticsLauncher"),
			"AppShell.tsx must import and render DirectOrthodonticsLauncher",
		);
	});

	it("18. Verifies DirectOrthodonticsLauncher is mounted in StandaloneLaunchers.tsx (Mandate 8aq)", () => {
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
	});

	it("19. Verifies SSR rendering of OrthodonticsStudioModal without DOM errors", () => {
		const html = renderToString(
			<OrthodonticsStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorName="Д-р Иванов"
			/>,
		);

		assert.ok(html.includes("Ортодонтическая студия"));
		assert.ok(html.includes("save-ortho-protocol-button"));
		assert.ok(html.includes("✓ Зафиксировать активацию этапа"));
		assert.ok(html.includes("Тестовый Пациент"));
	});
});
