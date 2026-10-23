/**
 * Unit tests for AppTopBar and top bar subcomponents (Mandates 8b, 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TopBarClinicSelector } from "../topBarModules/TopBarClinicSelector";
import { TopBarEmergencyBell } from "../topBarModules/TopBarEmergencyBell";
import { TopBarUserProfile } from "../topBarModules/TopBarUserProfile";

describe("AppTopBar Submodules Unit Tests", () => {
	it("TopBarClinicSelector renders clinic name and cabinet indicator", () => {
		const html = renderToString(
			<TopBarClinicSelector
				clinicName="ООО «Денте»"
				formattedDate="23 октября 2026"
				cabinetName="Кабинет 1"
			/>,
		);
		assert.ok(html.includes("ООО «Денте»"), "Must display clinic name");
		assert.ok(html.includes("Кабинет 1"), "Must display cabinet name");
	});

	it("TopBarEmergencyBell renders SOS button and alert badge", () => {
		const html = renderToString(
			<TopBarEmergencyBell
				showSosButton={true}
				activeCitoAlerts={[]}
			/>,
		);
		assert.ok(html.includes("SOS"), "Must contain SOS button");
		assert.ok(html.includes("topbar-emergency-rescue-btn"), "Must have emergency rescue button ID");
	});

	it("TopBarUserProfile renders profile trigger with proper aria-expanded", () => {
		const html = renderToString(
			<TopBarUserProfile
				selectedWorkspaceRole="doctor"
			/>,
		);
		assert.ok(html.includes("topbar-profile-btn"), "Must render profile button");
		assert.ok(html.includes('aria-expanded="false"'), "Initial state must be closed");
	});
});
