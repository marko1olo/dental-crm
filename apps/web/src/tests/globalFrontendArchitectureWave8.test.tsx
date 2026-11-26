import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../../testCssStub.mjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useQueryClient } from "@tanstack/react-query";
import { denteQueryClient, DenteQueryClientProvider } from "../lib/queryClient";
import { useAppStore } from "../store/appStore";
import { usePatientStore } from "../store/patientStore";
import { isStandaloneActive, isStandalonePatientCardActive } from "../appModules/appRoutingHelpers";
import { PatientCardModal } from "../components/patients/PatientCardModal";
import { VisitEmkTab } from "../components/visit/VisitEmkTab";
import { DEMO_PATIENT_CATALOG } from "../components/patients/patientCatalogData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcRoot = path.resolve(__dirname, "..");

describe("Global Frontend Architecture Surgical Fixes", () => {
	it("1. Root QueryClientProvider mounted in AppShell/main/App and DocumentsStudioModal uses DenteQueryClientProvider without orphan provider", () => {
		const appShellSrc = fs.readFileSync(path.join(webSrcRoot, "AppShell.tsx"), "utf8");
		const appSrc = fs.readFileSync(path.join(webSrcRoot, "App.tsx"), "utf8");
		const mainSrc = fs.readFileSync(path.join(webSrcRoot, "main.tsx"), "utf8");
		const docsModalSrc = fs.readFileSync(path.join(webSrcRoot, "components/documents/DocumentsStudioModal.tsx"), "utf8");

		assert.ok(appShellSrc.includes("<QueryClientProvider client={denteQueryClient}>"), "AppShell must wrap tree with QueryClientProvider");
		assert.ok(mainSrc.includes("<QueryClientProvider client={denteQueryClient}>"), "main.tsx must wrap roots with QueryClientProvider");
		assert.ok(appSrc.includes("<DenteQueryClientProvider>"), "App.tsx must ensure DenteQueryClientProvider");
		assert.ok(!docsModalSrc.includes("<QueryClientProvider"), "DocumentsStudioModal must not mount orphan QueryClientProvider");

		function ProbeClient() {
			const client = useQueryClient();
			return React.createElement("span", { "data-same": String(client === denteQueryClient) });
		}
		const html = renderToStaticMarkup(
			React.createElement(DenteQueryClientProvider, null, React.createElement(ProbeClient)),
		);
		assert.ok(html.includes('data-same="true"'), "DenteQueryClientProvider must provide canonical denteQueryClient");
	});

	it("2. useAppLogic has zero Proxy antipattern and Patient/App stores stay synchronized without split-brain", () => {
		const appLogicSrc = fs.readFileSync(path.join(webSrcRoot, "hooks/appLogic/index.ts"), "utf8");
		assert.ok(!appLogicSrc.includes("new Proxy("), "hooks/appLogic/index.ts must not use non-reactive Proxy");

		usePatientStore.getState().setSelectedPatientId("pat-sync-1");
		assert.equal(useAppStore.getState().activePatientId, "pat-sync-1", "Setting selectedPatientId must sync activePatientId");

		useAppStore.getState().setActivePatientId("pat-sync-2");
		assert.equal(usePatientStore.getState().selectedPatientId, "pat-sync-2", "Setting activePatientId must sync selectedPatientId");

		usePatientStore.getState().resetPatientSession();
		assert.equal(useAppStore.getState().activePatientId, null, "resetPatientSession must clear activePatientId");
	});

	it("3. useAppRoutingEvents removes every registered window listener on cleanup and wires DSD -> treatment plan", () => {
		const routingEventsSrc = fs.readFileSync(path.join(webSrcRoot, "appModules/useAppRoutingEvents.ts"), "utf8");
		assert.ok(routingEventsSrc.includes("for (const [eventName, handler] of eventBindings)"), "Must iterate unified eventBindings");
		assert.ok(routingEventsSrc.includes("window.removeEventListener(eventName, handler)"), "Must remove every listener in cleanup");
		assert.ok(routingEventsSrc.includes("dente-apply-dsd-to-treatment-plan"), "Must handle DSD handoff event");
	});

	it("4. AppShell strict URL/hash routing does not false-trigger on query values containing substrings", () => {
		assert.equal(isStandaloneActive("?patientId=pat-lab-123&filter=photo", "#patients"), false);
		assert.equal(isStandaloneActive("?tab=settings&patient=1", "#visit"), false);
		assert.equal(isStandalonePatientCardActive("?patientId=123", "#visit"), false);

		assert.equal(isStandaloneActive("?stand=cashbox", ""), true);
		assert.equal(isStandaloneActive("", "#odontogram?patientId=123"), true);
		assert.equal(isStandalonePatientCardActive("", "#patient-card?id=123"), true);
	});

	it("5. VisitEmkTab drops duplicate odontogram bar and integrates VisitSpecialtyFocus into EmkToolbar", () => {
		const emkTabSrc = fs.readFileSync(path.join(webSrcRoot, "components/visit/VisitEmkTab.tsx"), "utf8");
		assert.ok(!emkTabSrc.includes("<VisitEmkOdontogramBar"), "VisitEmkTab must not render duplicate VisitEmkOdontogramBar");
		assert.ok(emkTabSrc.includes("specialtyFocusNode="), "VisitEmkTab must pass specialtyFocusNode into EmkToolbar");

		const html = renderToStaticMarkup(
			React.createElement(VisitEmkTab, {
				visitNoteForm: {},
				updateVisitNoteField: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="visit-emk-tab"'), "VisitEmkTab renders cleanly");
	});

	it("6. PatientCardModal renders single-row tab navigation without flex-wrap or uppercase", () => {
		const cardSrc = fs.readFileSync(path.join(webSrcRoot, "components/patients/PatientCardModal.tsx"), "utf8");
		assert.ok(!cardSrc.includes("sm:flex-wrap"), "PatientCardModal tabs must stay single-row without wrapping");
		assert.ok(!cardSrc.includes("uppercase"), "PatientCardModal must not use uppercase");

		const html = renderToStaticMarkup(
			React.createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				mode: "view",
				patient: DEMO_PATIENT_CATALOG[0],
				patientData: DEMO_PATIENT_CATALOG[0],
			}),
		);
		assert.ok(html.includes('role="tablist"'), "Tablist must be rendered");
		assert.ok(html.includes('data-testid="tab-patient-general"'));
		assert.ok(html.includes('data-testid="tab-patient-family"'));
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
	});
});
