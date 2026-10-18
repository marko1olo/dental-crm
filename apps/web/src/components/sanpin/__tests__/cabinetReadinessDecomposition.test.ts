/**
 * @file cabinetReadinessDecomposition.test.ts
 * @description Integration & Architecture Verification Suite for CabinetReadinessTab Decomposition
 * (Mandates 8b, 8d, 8e, /decomposer skill, SanPiN 3.3686-21).
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	calculateLampOperatingHours,
	createCabinetReadinessRecord,
	createDefaultPaperJournalCabinetRecord,
	evaluateCabinetReadiness,
	getCabinetReadinessPreset,
} from "@dental/shared";
import { CabinetReadinessTab } from "../CabinetReadinessTab";
import {
	CabinetBactericidalTimer,
	CabinetReadinessActions,
	CabinetReadinessHistoryTable,
	CabinetReadinessStatusHeader,
	CabinetSanpinChecklist,
	useCabinetReadinessState,
} from "../cabinetReadiness";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANPIN_DIR = path.resolve(__dirname, "..");
const DECOMPOSED_DIR = path.join(SANPIN_DIR, "cabinetReadiness");
const FACADE_FILE = path.join(SANPIN_DIR, "CabinetReadinessTab.tsx");

describe("CabinetReadinessTab Monolith Decomposition & SanPiN Autonomy (Mandates 8b, 8e)", () => {
	it("1. Mandate 8b: Facade CabinetReadinessTab.tsx is strictly <= 120 lines", () => {
		const content = fs.readFileSync(FACADE_FILE, "utf8");
		const lineCount = content.split("\n").length;
		assert.ok(
			lineCount <= 120,
			`Expected CabinetReadinessTab.tsx facade <= 120 lines, got ${lineCount}`,
		);
	});

	it("2. Mandate 8b: All decomposed modules in cabinetReadiness/ exist and are strictly <= 800 lines", () => {
		const expectedFiles = [
			"types.ts",
			"CabinetReadinessStatusHeader.tsx",
			"CabinetSanpinChecklist.tsx",
			"CabinetBactericidalTimer.tsx",
			"CabinetReadinessActions.tsx",
			"CabinetReadinessHistoryTable.tsx",
			"useCabinetReadinessState.ts",
			"index.ts",
		];

		for (const file of expectedFiles) {
			const filePath = path.join(DECOMPOSED_DIR, file);
			assert.ok(fs.existsSync(filePath), `Expected decomposed module ${file} to exist`);
			const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(lines <= 800, `Expected ${file} <= 800 lines, got ${lines}`);
		}
	});

	it("3. Gate 2: Public exports are preserved on facade and barrel", () => {
		assert.equal(typeof CabinetReadinessTab, "function");
		assert.equal(typeof CabinetReadinessStatusHeader, "function");
		assert.equal(typeof CabinetSanpinChecklist, "function");
		assert.equal(typeof CabinetBactericidalTimer, "function");
		assert.equal(typeof CabinetReadinessActions, "function");
		assert.equal(typeof CabinetReadinessHistoryTable, "function");
		assert.equal(typeof useCabinetReadinessState, "function");
	});

	it("4. Gate 3: 100% of test anchors (data-testid) are preserved in decomposed module", () => {
		const headerCode = fs.readFileSync(
			path.join(DECOMPOSED_DIR, "CabinetReadinessStatusHeader.tsx"),
			"utf8",
		);
		const actionsCode = fs.readFileSync(
			path.join(DECOMPOSED_DIR, "CabinetReadinessActions.tsx"),
			"utf8",
		);
		const combined = headerCode + "\n" + actionsCode;
		assert.ok(
			combined.includes('data-testid="cabinet-readiness-start-appointment-btn"'),
			"Must preserve cabinet-readiness-start-appointment-btn",
		);
		assert.ok(
			combined.includes('data-testid="cabinet-readiness-autofill-btn"'),
			"Must preserve cabinet-readiness-autofill-btn",
		);
		assert.ok(
			combined.includes('data-testid="submit-cabinet-readiness-btn"'),
			"Must preserve submit-cabinet-readiness-btn",
		);
	});

	it("5. Mandate 8e: Staff Autonomy — 1-click 'Норма' preset and zero disabled buttons", () => {
		const checklistCode = fs.readFileSync(
			path.join(DECOMPOSED_DIR, "CabinetSanpinChecklist.tsx"),
			"utf8",
		);
		assert.ok(
			checklistCode.includes("Норма в 1 клик"),
			"Checklist must include 1-click 'Норма' button for assistant autonomy",
		);

		const files = fs.readdirSync(DECOMPOSED_DIR).filter((f) => f.endsWith(".tsx"));
		for (const file of files) {
			const code = fs.readFileSync(path.join(DECOMPOSED_DIR, file), "utf8");
			assert.ok(
				!code.includes("disabled={true}") && !code.includes("disabled="),
				`File ${file} must not contain blocking disabled buttons (Mandate 8e)`,
			);
		}
	});

	it("6. Domain Logic: Cabinet readiness evaluation, 1-click record creation and lamp hours math", () => {
		const preset = getCabinetReadinessPreset("therapy");
		assert.equal(preset.type, "therapy");
		assert.equal(preset.requiresCofferdam, true);

		const evalReady = evaluateCabinetReadiness({
			appointmentType: "therapy",
			surfaceDisinfection: { isCompleted: true, disinfectantBrand: "Бациллол АФ", exposureMinutes: 3 },
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
			},
		});
		assert.equal(evalReady.isFullyReady, true);
		assert.equal(evalReady.missingItems.length, 0);

		const paperNorm = createDefaultPaperJournalCabinetRecord({
			cabinetNumber: "Кабинет № 1",
			appointmentType: "therapy",
			operatorStaffFullName: "Ассистент стоматолога",
		});
		assert.equal(paperNorm.isFullyReady, true);
		assert.ok(paperNorm.digitalStampHash.length > 0);

		const lampCalc = calculateLampOperatingHours(1420, 30, 8000);
		assert.equal(lampCalc.sessionHours, 0.5);
		assert.equal(lampCalc.cumulativeHoursAfterSession, 1420.5);
		assert.equal(lampCalc.lampStatus, "normal");
	});

	it("7. Mandates 8e & 8n: Anti-Tamagotchi Law — Cabinet readiness has executive background auto-calculation and zero forced 20-checkbox list", () => {
		const checklistCode = fs.readFileSync(
			path.join(DECOMPOSED_DIR, "CabinetSanpinChecklist.tsx"),
			"utf8",
		);
		// Executive status cards present
		assert.ok(
			checklistCode.includes("Автоматический санитарный контроль готовности кабинета"),
			"Checklist must feature executive automated SanPiN control banner",
		);
		assert.ok(
			checklistCode.includes("Фоновый расчет нормативов без симуляции ручного труда"),
			"Checklist must explicitly declare background norm calculation without manual simulation",
		);

		// Manual micro-checkpoints are strictly in collapsible exceptions block
		assert.ok(
			checklistCode.includes("<details") && checklistCode.includes("<summary"),
			"Detailed unit checkpoints must be enclosed in collapsible section for exceptions only",
		);
		assert.ok(
			checklistCode.includes("Журнал исключений и ручная корректировка узлов"),
			"Summary must designate exceptions and repairs",
		);

		// Unfilled / unstarted checklist defaults to fully ready (norm by default per Mandates 8e & 8n)
		const unfilledDefault = evaluateCabinetReadiness({
			appointmentType: "therapy",
			nurseBypassedPaperLog: true,
		});
		assert.equal(unfilledDefault.isFullyReady, true);
		assert.equal(unfilledDefault.missingItems.length, 0);
	});
});

