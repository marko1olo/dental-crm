import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmkToolbar } from "../emk/EmkToolbar";
import { EmkAnesthesiaSection } from "../emk/EmkAnesthesiaSection";
import { VisitEmkSomaticSummaryBar } from "../emkTab/canvasModules/VisitEmkSomaticSummaryBar";
import { VisitEmkOdontogramBar } from "../emkTab/VisitEmkOdontogramBar";
import { VisitEmkTab } from "../VisitEmkTab";
import { infer804nServiceFromStamp } from "../infer804nService";

describe("Subagent 3: Visit Stepper, EMK Toolbar & Clinical Integrity Proof", () => {
	it("1. EmkToolbar renders clean primary row without confusing gray Undo/Redo or pulsating pimple", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkToolbar, {
				activeEmkTab: "all",
				setActiveEmkTab: () => {},
				onApplyPhysiologicalNorm: () => {},
				onApplyNorm: () => {},
				onToggleStarProtocols: () => {},
				onOpenConsent: () => {},
				onPrintMedicalCard: () => {},
			}),
		);

		assert.equal(html.includes("bg-amber-500 animate-pulse"), false, "EmkToolbar must not render pulsating orange pimple");
		assert.equal(html.includes("btn-toolbar-undo"), false, "EmkToolbar must not render btn-toolbar-undo in primary row");
		assert.equal(html.includes("btn-toolbar-redo"), false, "EmkToolbar must not render btn-toolbar-redo in primary row");
		assert.ok(html.includes("emk-autosave-status-badge"), "EmkToolbar must render autosave telemetry status badge");
	});

	it("2. VisitEmkSomaticSummaryBar stepper is free of Z01.2 noise and duplicate norm button", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitEmkSomaticSummaryBar, {
				handleCompleteVisitAndGenerateReceipt: async () => {},
				isCompletingVisit: false,
			}),
		);

		assert.equal(html.includes("btn-cockpit-quick-norm"), false, "Stepper must not render redundant norm button");
		assert.ok(html.includes("stepper-step-1"), "Step 1 must navigate to odontogram");
		assert.ok(html.includes("stepper-step-2"), "Step 2 must navigate to diary");
		assert.ok(html.includes("stepper-step-3"), "Step 3 must navigate to services");
		assert.ok(html.includes("btn-cockpit-quick-complete"), "Step 4 must render checkout CTA");
	});

	it("3. Embedded odontogram in VisitEmkOdontogramBar defaults to collapsed bar with formula summary", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitEmkOdontogramBar, {
				activePatient: { id: "pt-1", fullName: "Тестов И.И." },
				patientHistory: null,
				visitNoteForm: {},
				updateVisitNoteField: () => {},
				effectiveActiveTooth: 16,
			}),
		);

		assert.ok(html.includes("btn-open-odontogram-tab"), "Collapsed strip must render full Odontogram tab switcher");
		assert.ok(html.includes("btn-toggle-odontogram-collapse"), "Collapsed strip must render 1-click expand toggle");
		assert.equal(html.includes('data-testid="tooth-chart-container"'), false, "Embedded odontogram must default to collapsed state");
	});

	it("4. VisitEmkTab and EmkAnesthesiaSection mount cleanly alongside clinical tabs", () => {
		const tabHtml = renderToStaticMarkup(
			React.createElement(VisitEmkTab, {
				openVisitId: "visit-1",
				activePatient: { id: "pt-1", fullName: "Тестов И.И." },
				visitNoteForm: {},
				updateVisitNoteField: () => {},
			}),
		);
		const anesHtml = renderToStaticMarkup(
			React.createElement(EmkAnesthesiaSection, {
				visitNoteForm: {},
				updateVisitNoteField: () => {},
				isLocked: false,
			}),
		);

		assert.ok(tabHtml.includes('data-testid="visit-emk-tab"'), "VisitEmkTab root must mount cleanly");
		assert.ok(anesHtml.includes('data-testid="btn-anes-ultracain-ds"'), "Anesthesia quick presets must be preserved");
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

		assert.equal(infer804nServiceFromStamp("healthy", 11), null);
		assert.equal(infer804nServiceFromStamp("idle", 11), null);
	});
});
