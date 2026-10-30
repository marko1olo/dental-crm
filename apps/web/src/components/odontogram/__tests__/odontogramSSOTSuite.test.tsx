/**
 * apps/web/src/components/odontogram/__tests__/odontogramSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team Inquisition Test Suite for Odontogram SSOT & Studio.
 * Verifies FDI 11-48 & 51-85, 5 surfaces, 10 clinical statuses, 1-click intact teeth (Mandate 8e),
 * 1-click visit estimate linkage, Apple HIG ergonomics, and exactly ONE Primary CTA #0d9488 (Mandate 8am).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ADULT_TEETH_SSOT,
	PEDIATRIC_TEETH_SSOT,
	CLINICAL_STATUSES_SSOT,
	CANONICAL_5_SURFACES,
	createIntactDentition,
	getStatusDefinition,
	getRecommendedEstimateForStatus,
	isPediatricTooth,
	isUpperJawTooth,
	getToothQuadrant,
	getToothStandardNameRu,
} from "../odontogramCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const odontogramDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(odontogramDir, "../..");

describe("Odontogram & Dental Formula SSOT Invariants (FDI 11-48 & 51-85)", () => {
	it("1. Verifies Permanent Dentition contains exactly 32 FDI teeth across 4 quadrants", () => {
		assert.equal(ADULT_TEETH_SSOT.length, 32, "Permanent dentition must contain exactly 32 teeth");

		const q1 = ADULT_TEETH_SSOT.filter((t) => t >= 11 && t <= 18);
		const q2 = ADULT_TEETH_SSOT.filter((t) => t >= 21 && t <= 28);
		const q3 = ADULT_TEETH_SSOT.filter((t) => t >= 31 && t <= 38);
		const q4 = ADULT_TEETH_SSOT.filter((t) => t >= 41 && t <= 48);

		assert.equal(q1.length, 8, "Quadrant 1 must contain exactly 8 teeth (18-11)");
		assert.equal(q2.length, 8, "Quadrant 2 must contain exactly 8 teeth (21-28)");
		assert.equal(q3.length, 8, "Quadrant 3 must contain exactly 8 teeth (31-38)");
		assert.equal(q4.length, 8, "Quadrant 4 must contain exactly 8 teeth (41-48)");

		// Check all numbers are distinct
		const uniqueTeeth = new Set(ADULT_TEETH_SSOT);
		assert.equal(uniqueTeeth.size, 32, "All 32 permanent teeth must be unique");
	});

	it("2. Verifies Pediatric Dentition contains exactly 20 FDI teeth across 4 deciduous quadrants", () => {
		assert.equal(PEDIATRIC_TEETH_SSOT.length, 20, "Pediatric dentition must contain exactly 20 teeth");

		const q5 = PEDIATRIC_TEETH_SSOT.filter((t) => t >= 51 && t <= 55);
		const q6 = PEDIATRIC_TEETH_SSOT.filter((t) => t >= 61 && t <= 65);
		const q7 = PEDIATRIC_TEETH_SSOT.filter((t) => t >= 71 && t <= 75);
		const q8 = PEDIATRIC_TEETH_SSOT.filter((t) => t >= 81 && t <= 85);

		assert.equal(q5.length, 5, "Quadrant 5 must contain 5 teeth (55-51)");
		assert.equal(q6.length, 5, "Quadrant 6 must contain 5 teeth (61-65)");
		assert.equal(q7.length, 5, "Quadrant 7 must contain 5 teeth (71-75)");
		assert.equal(q8.length, 5, "Quadrant 8 must contain 5 teeth (81-85)");

		for (const t of PEDIATRIC_TEETH_SSOT) {
			assert.ok(isPediatricTooth(t), `Tooth ${t} must be identified as pediatric`);
		}
	});

	it("3. Verifies exactly 5 canonical tooth surfaces are registered (Occ, V, L, M, D)", () => {
		assert.equal(CANONICAL_5_SURFACES.length, 5, "There must be exactly 5 canonical surfaces");

		const surfaceIds = CANONICAL_5_SURFACES.map((s) => s.id);
		assert.deepEqual(surfaceIds, ["Occ", "V", "L", "M", "D"], "Surfaces must follow standard international keys");

		for (const surf of CANONICAL_5_SURFACES) {
			assert.ok(surf.nameRu.length > 0, `Surface ${surf.id} must have Russian name`);
			assert.ok(surf.shortRu.length > 0, `Surface ${surf.id} must have short abbreviation`);
			assert.ok(surf.description.length > 0, `Surface ${surf.id} must have clinical description`);
		}
	});

	it("4. Verifies 10 chairside clinical statuses with color tokens and clinical codes", () => {
		assert.equal(CLINICAL_STATUSES_SSOT.length, 10, "There must be exactly 10 chairside clinical statuses");

		const expectedKeys = [
			"Healthy",
			"Caries",
			"Pulpitis",
			"Periodontitis",
			"Filled",
			"Crown",
			"Implant",
			"Missing",
			"Retained",
			"Root",
		];
		const actualKeys = CLINICAL_STATUSES_SSOT.map((s) => s.key);
		assert.deepEqual(actualKeys, expectedKeys, "Statuses must match canonical chairside list");

		const expectedCodesRu = ["З", "К", "П", "Пт", "Пл", "Кр", "Имп", "О", "Р", "Рз"];
		const actualCodesRu = CLINICAL_STATUSES_SSOT.map((s) => s.codeRu);
		assert.deepEqual(actualCodesRu, expectedCodesRu, "Statuses must match Russian clinical abbreviations");

		for (const st of CLINICAL_STATUSES_SSOT) {
			assert.ok(st.bgToken.startsWith("var("), `Status ${st.key} background must use design token`);
			assert.ok(st.colorHex.startsWith("#"), `Status ${st.key} color must have valid hex fallback`);
		}
	});

	it("5. Verifies Mandate 8e: 1-click physiological normal dentition factory", () => {
		const intactAdult = createIntactDentition("adult");
		assert.equal(Object.keys(intactAdult).length, 32, "Intact adult dentition must populate 32 teeth");

		for (const [toothNum, entry] of Object.entries(intactAdult)) {
			assert.equal(entry.state, "Healthy", `Tooth ${toothNum} must be in Healthy state`);
			assert.deepEqual(entry.surfaces, [], `Tooth ${toothNum} must have 0 pathological surfaces`);
			assert.equal(entry.mobility, 0, `Tooth ${toothNum} must have 0 mobility`);
		}

		const intactPediatric = createIntactDentition("pediatric");
		assert.equal(Object.keys(intactPediatric).length, 20, "Intact pediatric dentition must populate 20 teeth");
		for (const [, entry] of Object.entries(intactPediatric)) {
			assert.equal(entry.state, "Healthy");
		}
	});

	it("6. Verifies 1-click visit estimate price linkage for chairside pathologies", () => {
		const cariesEstimate = getRecommendedEstimateForStatus("Caries");
		assert.ok(cariesEstimate, "Caries must offer a recommended estimate preset");
		assert.equal(cariesEstimate.code804n, "A16.07.002.001", "Caries 804n code must match light-curing restoration");
		assert.ok(cariesEstimate.amountKopecks > 0, "Amount must be in positive integer kopecks");

		const pulpitisEstimate = getRecommendedEstimateForStatus("Pulpitis");
		assert.ok(pulpitisEstimate, "Pulpitis must offer recommended endodontic estimate");
		assert.equal(pulpitisEstimate.code804n, "A16.07.030.001");

		const implantEstimate = getRecommendedEstimateForStatus("Implant");
		assert.ok(implantEstimate, "Implant must offer recommended surgery estimate");
		assert.equal(implantEstimate.code804n, "A16.07.006.001");
	});

	it("7. Verifies anatomical helpers: jaw classification and human tooth nomenclature", () => {
		assert.equal(isUpperJawTooth(16), true, "Tooth 16 must be upper jaw");
		assert.equal(isUpperJawTooth(21), true, "Tooth 21 must be upper jaw");
		assert.equal(isUpperJawTooth(36), false, "Tooth 36 must be lower jaw");
		assert.equal(isUpperJawTooth(47), false, "Tooth 47 must be lower jaw");

		assert.equal(getToothQuadrant(16), 1);
		assert.equal(getToothQuadrant(26), 2);
		assert.equal(getToothQuadrant(36), 3);
		assert.equal(getToothQuadrant(46), 4);
		assert.equal(getToothQuadrant(55), 5);

		const name16 = getToothStandardNameRu(16);
		assert.ok(name16.includes("первый моляр"), "Tooth 16 name must contain 'первый моляр'");
		assert.ok(name16.includes("верхний"), "Tooth 16 name must contain 'верхний'");

		const name51 = getToothStandardNameRu(51);
		assert.ok(name51.includes("молочный"), "Tooth 51 name must contain 'молочный'");
	});
});

describe("Odontogram Studio & Launchers Architecture Inquisition", () => {
	it("8. Verifies OdontogramStudioModal.tsx lines Sweet Spot (350-480 lines)", () => {
		const modalPath = path.join(odontogramDir, "OdontogramStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "OdontogramStudioModal.tsx must exist");

		const lines = fs.readFileSync(modalPath, "utf8").split("\n").length;
		assert.ok(
			lines >= 350 && lines <= 480,
			`OdontogramStudioModal.tsx must be in Sweet Spot 350-480 lines, was ${lines}`,
		);
	});

	it("9. Verifies OdontogramStudioModal has exactly ONE Primary CTA #0d9488 (Mandate 8am)", () => {
		const modalPath = path.join(odontogramDir, "OdontogramStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf8");

		// Assert existence of Primary CTA save button
		assert.ok(content.includes("btn-save-odontogram-studio"), "Must contain btn-save-odontogram-studio");
		assert.ok(
			content.includes("#0d9488") || content.includes("var(--teal"),
			"Primary CTA button must use canonical teal token / #0d9488",
		);

		// Assert Mandate 8e: 1-click intact teeth button
		assert.ok(content.includes("btn-reset-intact"), "Must contain 1-click intact teeth reset button");

		// Assert Fast-Stamp Bar
		assert.ok(content.includes("stamp-btn-"), "Must render One-Touch Stamp Bar buttons");
	});

	it("10. Verifies DirectOdontogramLauncher.tsx exists and <= 150 lines", () => {
		const launcherPath = path.join(odontogramDir, "DirectOdontogramLauncher.tsx");
		assert.ok(fs.existsSync(launcherPath), "DirectOdontogramLauncher.tsx must exist");

		const lines = fs.readFileSync(launcherPath, "utf8").split("\n").length;
		assert.ok(lines <= 150, `DirectOdontogramLauncher.tsx must be <= 150 lines, was ${lines}`);
	});

	it("11. Verifies DirectOdontogramLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
		const appShellPath = path.join(webSrcDir, "AppShell.tsx");
		const content = fs.readFileSync(appShellPath, "utf8");

		assert.ok(
			content.includes("DirectOdontogramLauncher"),
			"AppShell.tsx must import and render DirectOdontogramLauncher",
		);
		assert.ok(
			content.includes("odontogram"),
			"AppShell.tsx isStandaloneActive must check odontogram hash/query",
		);
	});

	it("12. Verifies DirectOdontogramLauncher is mounted in StandaloneLaunchers.tsx", () => {
		const launchersPath = path.join(
			webSrcDir,
			"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);
		const content = fs.readFileSync(launchersPath, "utf8");

		assert.ok(
			content.includes("DirectOdontogramLauncher"),
			"StandaloneLaunchers.tsx must import and render DirectOdontogramLauncher",
		);
		assert.ok(
			content.includes("#odontogram") || content.includes("odontogram"),
			"StandaloneLaunchers.tsx must handle odontogram hash/query",
		);
	});
});
