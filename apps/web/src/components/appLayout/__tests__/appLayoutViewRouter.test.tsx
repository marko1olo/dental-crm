import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { ViewRouterContainer } from "../viewRouterModules/ViewRouterContainer";

describe("ViewRouterContainer Unit Tests", () => {
	it("renders workspace container with correct view class and aria label", () => {
		const html = renderToString(
			<ViewRouterContainer
				currentView="schedule"
				topBar={<header id="mock-topbar">TopBar</header>}
				toastPortal={<div id="mock-toast">Toast</div>}
				dashboard={null as any}
				isAppointmentModalOpen={false}
				setIsAppointmentModalOpen={() => {}}
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
				currentView="patients"
				topBar={<header>TopBar</header>}
				toastPortal={null}
				dashboard={null as any}
				isAppointmentModalOpen={false}
				setIsAppointmentModalOpen={() => {}}
			/>,
		);

		assert.ok(html.includes("work-grid page-grid"));
	});
});
