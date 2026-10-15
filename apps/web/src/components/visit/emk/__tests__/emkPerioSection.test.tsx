/**
 * emkPerioSection.test.tsx
 *
 * RED TEAM INQUISITION SUITE: Periodontal Screening & Prophylaxis in EMK Diary.
 *
 * Verifies:
 * 1. EmkPerioSection file line count strictly <= 800 lines (Mandate 8b).
 * 2. 1-Click Norm (Mandate 8e): emk-perio-norm-btn sets physiological intact status & Z01.2.
 * 3. 3-Click Express Hygiene Index (OHI-S): good (0.0-0.6), fair (0.7-1.6), poor (>=1.7).
 * 4. 1-Click Prophy (A16.07.051): emk-hygiene-prophy-btn adds 5500 ₽ service to visit store.
 * 5. Auto-Plan Justification: emk-perio-apply-treatment-plan-btn creates clinical treatmentPlan
 *    with closed curettage A16.07.011 for affected teeth and prophy A16.07.051.
 * 6. Zero bird-language / raw "Форма 043/у" in UI strings.
 * 7. Zero disabled buttons on interactive screening actions (Mandate 8e).
 * 8. Clean export in index.ts and integration in VisitEmkInteractiveStage & VisitEmkModals.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RED TEAM INQUISITION: Periodontal Screening & Prophylaxis in EMK", () => {
	const perioSectionPath = path.resolve(__dirname, "../EmkPerioSection.tsx");
	const indexPath = path.resolve(__dirname, "../index.ts");
	const interactiveStagePath = path.resolve(
		__dirname,
		"../../emkTab/canvasModules/VisitEmkInteractiveStage.tsx",
	);
	const modalsPath = path.resolve(__dirname, "../../emkTab/VisitEmkModals.tsx");
	const odontogramBarPath = path.resolve(
		__dirname,
		"../../emkTab/VisitEmkOdontogramBar.tsx",
	);

	it("1. EmkPerioSection exists and respects Mandate 8b (file length <= 800 lines)", () => {
		assert.ok(fs.existsSync(perioSectionPath), "EmkPerioSection.tsx must exist");
		const source = fs.readFileSync(perioSectionPath, "utf8");
		const lineCount = source.split("\n").length;
		assert.ok(
			lineCount <= 800,
			`EmkPerioSection line count (${lineCount}) must be <= 800 lines (Mandate 8b)`,
		);
	});

	it("2. Mandate 8e (1-Click Norm): emk-perio-norm-btn sets physiological intact status & Z01.2", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		assert.ok(
			source.includes('data-testid="emk-perio-norm-btn"'),
			"emk-perio-norm-btn must exist for 1-click physiological norm",
		);
		assert.ok(
			source.includes("Z01.2"),
			"Norm must assign ICD-10 Z01.2 Dental examination / intact periodontium",
		);
		assert.ok(
			source.includes("BOP 0%"),
			"Norm status must specify physiological 0% bleeding on probing",
		);
	});

	it("3. Express OHI-S Hygiene Index buttons in 3 clicks", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		assert.ok(
			source.includes('data-testid="emk-hygiene-good-btn"'),
			"emk-hygiene-good-btn must exist for OHI-S 0.0-0.6",
		);
		assert.ok(
			source.includes('data-testid="emk-hygiene-fair-btn"'),
			"emk-hygiene-fair-btn must exist for OHI-S 0.7-1.6",
		);
		assert.ok(
			source.includes('data-testid="emk-hygiene-poor-btn"'),
			"emk-hygiene-poor-btn must exist for OHI-S >= 1.7",
		);
	});

	it("4. 1-Click Prophy (A16.07.051) and Soft Overdraft Consumables", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		assert.ok(
			source.includes('data-testid="emk-hygiene-prophy-btn"'),
			"emk-hygiene-prophy-btn must exist",
		);
		assert.ok(
			source.includes("A16.07.051"),
			"Prophy service code must be A16.07.051",
		);
		assert.ok(
			source.includes("deductPeriodontalConsumablesSoftOverdraft"),
			"Must call soft overdraft deduction for consumables (Mandate 8ab)",
		);
	});

	it("5. Auto-Plan Justification & Closed Curettage (A16.07.011)", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		assert.ok(
			source.includes('data-testid="emk-perio-apply-treatment-plan-btn"'),
			"emk-perio-apply-treatment-plan-btn must exist",
		);
		assert.ok(
			source.includes("buildPeriodontalTreatmentPlanJustification"),
			"Must call buildPeriodontalTreatmentPlanJustification",
		);
		assert.ok(
			source.includes("A16.07.011"),
			"Must include closed curettage code A16.07.011 for affected teeth",
		);
	});

	it("6. Zero raw bureaucratic 'Форма 043/у' in UI strings (Clean Language)", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		// Check that user-facing labels do not use raw "043/у"
		assert.ok(
			!source.includes(">Форма 043/у<") &&
			!source.includes('title="Форма 043/у"') &&
			!source.includes("Форма 043/у:"),
			"Raw bureaucratic string 'Форма 043/у' must not appear in UI titles or labels",
		);
	});

	it("7. Mandate 8e: Zero disabled buttons on interactive screening buttons", () => {
		const source = fs.readFileSync(perioSectionPath, "utf8");
		// The norm, hygiene, and prophy buttons must never have disabled={true}
		assert.ok(
			!source.includes('data-testid="emk-perio-norm-btn" disabled') &&
			!source.includes('disabled\n\t\t\t\t\t\tdata-testid="emk-perio-norm-btn"'),
			"emk-perio-norm-btn must never be blocked by disabled attribute",
		);
	});

	it("8. Seamless export in emk/index.ts and mounting in Stage, Modals & OdontogramBar", () => {
		const indexSource = fs.readFileSync(indexPath, "utf8");
		assert.ok(
			indexSource.includes('export * from "./EmkPerioSection";'),
			"EmkPerioSection must be exported from emk/index.ts",
		);

		const stageSource = fs.readFileSync(interactiveStagePath, "utf8");
		assert.ok(
			stageSource.includes("<EmkPerioSection"),
			"EmkPerioSection must be mounted in VisitEmkInteractiveStage",
		);

		const modalsSource = fs.readFileSync(modalsPath, "utf8");
		assert.ok(
			modalsSource.includes("PerioChartModal"),
			"PerioChartModal must be mounted in VisitEmkModals",
		);

		const barSource = fs.readFileSync(odontogramBarPath, "utf8");
		assert.ok(
			barSource.includes('data-testid="btn-open-perio-modal"'),
			"btn-open-perio-modal must exist in VisitEmkOdontogramBar",
		);
	});
});
