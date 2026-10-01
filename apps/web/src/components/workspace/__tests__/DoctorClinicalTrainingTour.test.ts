/**
 * DoctorClinicalTrainingTour.test.ts
 *
 * Red Team Inquisitor Verification:
 * 1. Clinical Tour Steps Invariant: Exactly 4 key operations (Schedule 1-click, Odontogram FDI/Norm, Diary 043/u, Fast Cashier 54-FZ).
 * 2. Non-blocking Ergonomics & Target Beacon: pointer-events: none, z-index hierarchy (beacon 1049, card 1050, below modal 1100).
 * 3. Doctor Autonomy: Escape handler, outside click dismiss, and permanent persistence (localStorage "dente_tour_completed").
 * 4. Zero Cartoon Emojis: All titles, descriptions, and tips use clinical typography without frivolous emojis.
 * 5. Shell Wiring: workspaceShell and help navigation are correctly instrumented with data-tour selectors.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	CLINICAL_TRAINING_STEPS,
	DENTE_TOUR_STORAGE_KEY,
	completeTourPermanently,
	isTourCompleted,
	resetDoctorTour,
} from "../DoctorClinicalTrainingTour";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("DoctorClinicalTrainingTour — Clinical Operations & Ergonomics Verification", async (t) => {
	await t.test("1. Clinical training steps contain exactly the 4 required core operations", () => {
		assert.strictEqual(CLINICAL_TRAINING_STEPS.length, 4, "Must define exactly 4 clinical training steps");

		const stepIds = CLINICAL_TRAINING_STEPS.map((s) => s.id);
		assert.deepStrictEqual(
			stepIds,
			["schedule_1click", "odontogram_formula", "visit_diary_043", "fast_cashier_54fz"],
			"Step IDs must match the 4 essential operations",
		);

		// Step 1: Schedule 1-click
		const step1 = CLINICAL_TRAINING_STEPS[0]!;
		assert.ok(step1.title.includes("расписани"), "Step 1 must cover appointment scheduling");
		assert.ok(step1.shortcutBadge.includes("Space") || step1.shortcutBadge.includes("Enter"));
		assert.ok(step1.targetSelector.includes("schedule-booking"));

		// Step 2: Odontogram FDI & Norm
		const step2 = CLINICAL_TRAINING_STEPS[1]!;
		assert.ok(step2.title.includes("Зубная формула") || step2.title.includes("одонтограмм"));
		assert.ok(step2.description.includes("Shift+N"), "Step 2 must instruct on Shift+N 1-click norm");
		assert.ok(step2.description.includes("FDI") || step2.description.includes("1..8"));
		assert.ok(step2.description.includes("C") && step2.description.includes("P") && step2.description.includes("K"));

		// Step 3: Diary & Form 043/u
		const step3 = CLINICAL_TRAINING_STEPS[2]!;
		assert.ok(step3.title.includes("043/у") || step3.title.includes("Протокол"));
		assert.ok(step3.description.includes("Ctrl+S"), "Step 3 must cover Ctrl+S auto-drafts");
		assert.ok(step3.description.includes("F12"), "Step 3 must cover F12 printing without bureaucracy");

		// Step 4: Fast Cashier 54-FZ
		const step4 = CLINICAL_TRAINING_STEPS[3]!;
		assert.ok(step4.title.includes("54-ФЗ") || step4.title.includes("Касса"));
		assert.ok(step4.description.includes("54-ФЗ"));
		assert.ok(step4.description.includes("ИНН"), "Step 4 must state no mandatory individual INN");
		assert.ok(step4.shortcutBadge.includes("F9"), "Step 4 must indicate F9 checkout");
	});

	await t.test("2. Zero cartoon emojis in medical/financial training strings", () => {
		// Matches common emoji symbols like rocket, fire, sparkles emoji, party popper, etc.
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const step of CLINICAL_TRAINING_STEPS) {
			assert.strictEqual(
				emojiRegex.test(step.title),
				false,
				`Step title "${step.title}" must not contain cartoon emojis`,
			);
			assert.strictEqual(
				emojiRegex.test(step.badge),
				false,
				`Step badge "${step.badge}" must not contain cartoon emojis`,
			);
			assert.strictEqual(
				emojiRegex.test(step.description),
				false,
				`Step description for "${step.id}" must not contain cartoon emojis`,
			);
			assert.strictEqual(
				emojiRegex.test(step.clinicalTip),
				false,
				`Step clinical tip for "${step.id}" must not contain cartoon emojis`,
			);
			assert.strictEqual(
				emojiRegex.test(step.shortcutBadge),
				false,
				`Step shortcutBadge for "${step.id}" must not contain cartoon emojis`,
			);
		}
	});

	await t.test("3. LocalStorage persistence: dente_tour_completed key and helper functions", () => {
		assert.strictEqual(DENTE_TOUR_STORAGE_KEY, "dente_tour_completed");

		// Mock localStorage for test environment
		const storageMap = new Map<string, string>();
		const mockStorage: Storage = {
			getItem: (key: string) => storageMap.get(key) ?? null,
			setItem: (key: string, val: string) => {
				storageMap.set(key, String(val));
			},
			removeItem: (key: string) => {
				storageMap.delete(key);
			},
			clear: () => storageMap.clear(),
			key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
			length: storageMap.size,
		};

		// Assign global mock
		const originalWindow = (globalThis as unknown as { window?: { localStorage?: Storage } }).window;
		(globalThis as unknown as { window: { localStorage: Storage } }).window = {
			localStorage: mockStorage,
		};

		try {
			// Initially not completed
			assert.strictEqual(isTourCompleted(), false);

			// Complete tour
			completeTourPermanently();
			assert.strictEqual(mockStorage.getItem(DENTE_TOUR_STORAGE_KEY), "true");
			assert.strictEqual(isTourCompleted(), true);

			// Reset tour
			resetDoctorTour();
			assert.strictEqual(mockStorage.getItem(DENTE_TOUR_STORAGE_KEY), null);
			assert.strictEqual(isTourCompleted(), false);
		} finally {
			// Restore original
			if (originalWindow) {
				(globalThis as unknown as { window?: { localStorage?: Storage } }).window = originalWindow;
			} else {
				delete (globalThis as unknown as { window?: unknown }).window;
			}
		}
	});

	await t.test("4. Non-blocking beacon ergonomics & z-index hierarchy", () => {
		const componentPath = path.resolve(__dirname, "../DoctorClinicalTrainingTour.tsx");
		const content = fs.readFileSync(componentPath, "utf8");

		// Non-blocking beacon verification
		assert.ok(
			content.includes('pointerEvents: "none"'),
			"Target beacon outline must specify pointerEvents: 'none' to allow direct clicks on underlying buttons",
		);
		assert.ok(
			content.includes("zIndex: 1049"),
			"Target beacon outline must be layered at zIndex: 1049 (below coach card 1050)",
		);
		assert.ok(
			content.includes("zIndex: 1050") || content.includes("1050"),
			"Coach card must be layered at zIndex: 1050 (above regular controls, below modal 1100)",
		);

		// Doctor Autonomy: Escape and outside pointerdown handling
		assert.ok(content.includes('e.key === "Escape"'), "Tour must handle Escape key dismiss");
		assert.ok(content.includes("handlePointerDown"), "Tour must handle outside click dismiss");
		assert.ok(content.includes("dente:start-doctor-tour"), "Tour must listen for global start event");
	});

	await t.test("5. Shell wiring: workspaceShell.tsx has matching tour targets", () => {
		const shellPath = path.resolve(__dirname, "../../../workspaceShell.tsx");
		const shellContent = fs.readFileSync(shellPath, "utf8");

		assert.ok(
			shellContent.includes('data-tour="schedule-booking"') && shellContent.includes("topbar-booking-action-btn"),
			"workspaceShell must have data-tour='schedule-booking' and #topbar-booking-action-btn on primary booking button",
		);
		assert.ok(
			shellContent.includes('"visit-diary"') && shellContent.includes("topbar-doctor-visit-btn"),
			"workspaceShell must have visit-diary for doctor visit navigation",
		);
		assert.ok(
			shellContent.includes('"fast-cashier"'),
			"workspaceShell must have fast-cashier for cashier/finance navigation",
		);
	});

	await t.test("6. Help Drawer & Guidance Modal integration", () => {
		const helpDrawerPath = path.resolve(__dirname, "../../common/HelpDrawer.tsx");
		const helpContent = fs.readFileSync(helpDrawerPath, "utf8");
		assert.ok(
			helpContent.includes("dente:start-doctor-tour"),
			"HelpDrawer must provide trigger for dente:start-doctor-tour",
		);

		const guidanceModalPath = path.resolve(__dirname, "../../guidance/ClinicalGuidanceModal.tsx");
		const guidanceContent = fs.readFileSync(guidanceModalPath, "utf8");
		assert.ok(
			guidanceContent.includes("dente:start-doctor-tour"),
			"ClinicalGuidanceModal must provide trigger for dente:start-doctor-tour",
		);

		const guidanceHostPath = path.resolve(__dirname, "../../guidance/ClinicalGuidanceHost.tsx");
		const guidanceHostContent = fs.readFileSync(guidanceHostPath, "utf8");
		assert.ok(
			guidanceHostContent.includes("DoctorClinicalTrainingTour"),
			"ClinicalGuidanceHost must mount DoctorClinicalTrainingTour",
		);
	});
});
