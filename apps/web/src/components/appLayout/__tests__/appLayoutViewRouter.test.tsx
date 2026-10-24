import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { ViewRouterContainer } from "../viewRouterModules/ViewRouterContainer";
import type { AppViewRouterProps } from "../types";

/**
 * ViewRouterContainer — раскладка рабочей области. Данные приходят через
 * полный набор пропсов контейнера (null для ssr-теста), без выдуманных
 * модальных флагов старой версии.
 */
const baseProps: AppViewRouterProps = {
	currentView: "schedule",
	dashboard: null,
	activeStaffUser: null,
	activeVisitPatient: null,
	activePatient: null,
	activePatientInsight: null,
	activeCommunicationTasks: null,
	activeImagingStudies: null,
	activeUsableDocuments: null,
	patientId: null,
	clinicProfileDraft: null,
	appLogicValue: null,
};

describe("ViewRouterContainer Unit Tests", () => {
	it("renders workspace container with correct view class and aria label", () => {
		const html = renderToString(
			<ViewRouterContainer
				{...baseProps}
				topBar={<header id="mock-topbar">TopBar</header>}
				toastPortal={<div id="mock-toast">Toast</div>}
			/>,
		);

		assert.ok(html.includes('class="workspace view-schedule"'));
		assert.ok(html.includes('aria-label="Рабочая область"'));
		assert.ok(html.includes('id="mock-topbar"'));
		assert.ok(html.includes('id="mock-toast"'));
	});

	it("renders work-grid page-grid for grid-based views like patients", () => {
		const html = renderToString(
			<ViewRouterContainer
				{...baseProps}
				currentView="patients"
				topBar={<header>TopBar</header>}
				toastPortal={null}
			/>,
		);

		assert.ok(html.includes("work-grid page-grid"));
	});
});
