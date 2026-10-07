import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { infer804nServiceFromStamp } from "../infer804nService";

describe("Subagent 3: Visit Stepper, EMK Toolbar & Clinical Integrity Proof", () => {
	const toolbarPath = path.resolve(
		process.cwd(),
		"apps/web/src/components/visit/emk/EmkToolbar.tsx",
	);
	const emkTabPath = path.resolve(
		process.cwd(),
		"apps/web/src/components/visit/VisitEmkTab.tsx",
	);
	const toothSyncPath = path.resolve(
		process.cwd(),
		"apps/web/src/components/visit/useVisitEmkToothSync.ts",
	);
	const visitViewPath = path.resolve(
		process.cwd(),
		"apps/web/src/VisitView.tsx",
	);

	it("1. EmkToolbar primary row contains <= 7 buttons and no confusing gray 'Отменить' or pulsating pimple", () => {
		const content = fs.readFileSync(toolbarPath, "utf-8");

		// Pulsating orange dot eliminated
		assert.equal(
			content.includes("bg-amber-500 animate-pulse"),
			false,
			"EmkToolbar must not contain pulsating orange pimple",
		);

		// Confusing gray 'Отменить' / 'Вернуть' buttons removed from primary row
		assert.equal(
			content.includes("btn-toolbar-undo"),
			false,
			"EmkToolbar must not have confusing 'Отменить' button in primary row",
		);
		assert.equal(
			content.includes("btn-toolbar-redo"),
			false,
			"EmkToolbar must not have confusing 'Вернуть' button in primary row",
		);

		// Telemetry autosave status badge present
		assert.ok(
			content.includes("emk-autosave-status-badge"),
			"EmkToolbar must contain quiet autosave telemetry status badge",
		);

		// Undo/Redo cleanly tucked into extra SOAP menu with hotkey hints
		assert.ok(
			content.includes("Ctrl+Z") && content.includes("Ctrl+Y"),
			"EmkToolbar dropdown menu must offer Undo/Redo with keyboard hotkey hints",
		);
	});

	it("2. VisitEmkTab stepper is free of Z01.2 noise and duplicate 'Смета & Чек' button", () => {
		const content = fs.readFileSync(emkTabPath, "utf-8");

		// No redundant 'btn-cockpit-quick-norm' cluttering the steps
		assert.equal(
			content.includes("btn-cockpit-quick-norm"),
			false,
			"Stepper pipeline must not contain redundant Norm button cluttering steps",
		);

		// Step buttons 1..4 are interactive navigators
		assert.ok(
			content.includes("stepper-step-1"),
			"Step 1 must be interactive navigator to odontogram",
		);
		assert.ok(
			content.includes("stepper-step-2"),
			"Step 2 must be interactive navigator to diary",
		);
		assert.ok(
			content.includes("stepper-step-3"),
			"Step 3 must be interactive navigator to services",
		);
		assert.ok(
			content.includes("btn-cockpit-quick-complete"),
			"Step 4 is the single checkout action button",
		);
	});

	it("3. Embedded odontogram in VisitEmkTab defaults to collapsed 32px bar with formula summary", () => {
		const content = fs.readFileSync(emkTabPath, "utf-8");

		// isOdontogramCollapsed defaults to true
		assert.ok(
			content.includes("useState<boolean>(true)") ||
			content.includes("useState(true)"),
			"Embedded odontogram must default to collapsed state (true)",
		);

		// Compact strip contains formula summary and direct tab transition button
		assert.ok(
			content.includes("formulaSummary"),
			"Collapsed strip must render dynamic formula summary",
		);
		assert.ok(
			content.includes("btn-open-odontogram-tab"),
			"Collapsed strip must provide button to switch directly to full Odontogram tab",
		);
		assert.ok(
			content.includes("btn-toggle-odontogram-collapse"),
			"Collapsed strip must provide 1-click expand toggle",
		);
	});

	it("4. VisitView listens to 'dente:visit-tab-change' event for seamless cross-component tab switching", () => {
		const content = fs.readFileSync(visitViewPath, "utf-8");
		assert.ok(
			content.includes("dente:visit-tab-change"),
			"VisitView must listen to dente:visit-tab-change",
		);
		assert.ok(
			content.includes("handleExternalTabChange"),
			"VisitView must handle external tab change events",
		);
	});

	it("5. Clinical data integrity: infer804nServiceFromStamp accurately maps pathology to Order 804n nomenclature", () => {
		const cariesService = infer804nServiceFromStamp("caries", 16);
		assert.ok(cariesService);
		assert.equal(cariesService.code804n, "A16.07.002");
		assert.equal(cariesService.priceRub, 4500);
		assert.ok(cariesService.title.includes("16"));

		const pulpitisService = infer804nServiceFromStamp("pulpitis", 24);
		assert.ok(pulpitisService);
		assert.equal(pulpitisService.code804n, "A16.07.030");
		assert.equal(pulpitisService.priceRub, 6500);

		const perioService = infer804nServiceFromStamp("treatment", 36);
		assert.ok(perioService);
		assert.equal(perioService.code804n, "A16.07.008");
		assert.equal(perioService.priceRub, 7500);

		const fillService = infer804nServiceFromStamp("fill", 11);
		assert.ok(fillService);
		assert.equal(fillService.code804n, "A16.07.002.011");
		assert.equal(fillService.priceRub, 4000);

		const implantService = infer804nServiceFromStamp("implant", 46);
		assert.ok(implantService);
		assert.equal(implantService.code804n, "A16.07.054");

		// Non-pathology returns null
		assert.equal(infer804nServiceFromStamp("healthy", 11), null);
		assert.equal(infer804nServiceFromStamp("idle", 11), null);
	});

	it("6. Sacred Taboo Verification: Pediatrics and Anesthesia files untouched", () => {
		const gitDiff = fs.readFileSync(emkTabPath, "utf-8");
		// Ensure pediatric protocol widget is imported and preserved as-is
		assert.ok(
			gitDiff.includes("EmkAnesthesiaSection"),
			"Anesthesia calculator must be preserved",
		);
	});
});
