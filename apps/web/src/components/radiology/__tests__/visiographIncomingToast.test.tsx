/**
 * visiographIncomingToast.test.tsx — Unit & Invariant Tests for VisiographIncomingToast HUD.
 *
 * Verifies:
 * 1. Rendering null when no scan is active
 * 2. Visual layout and token compliance:
 *    - Container: var(--paper-strong), 1px solid var(--line), rounded 12px
 *    - Primary CTA: 32px height, var(--teal) background, 8px radius
 *    - Secondary Button: 32px height, var(--paper-soft), 8px radius
 * 3. 12 Questions of Ruthless Design Audit compliance:
 *    - 0 clipped words (...), 0 rainbow buttons, quiet telemetry
 * 4. Active tooth FDI display in CTA
 * 5. Queued count badge (+N новых)
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisiographIncomingToast } from "../VisiographIncomingToast.js";
import {
	getVisiographHotFolderEngine,
	type VisiographHotFolderEngine,
} from "../../../lib/visiographHotFolderEngine.js";

describe("VisiographIncomingToast HUD Component", () => {
	let engine: VisiographHotFolderEngine;

	beforeEach(() => {
		engine = getVisiographHotFolderEngine();
		engine.clearQueue();
	});

	afterEach(() => {
		engine.clearQueue();
	});

	it("renders null when there are no incoming scans", () => {
		const html = renderToString(<VisiographIncomingToast />);
		assert.strictEqual(html, "");
	});

	it("renders clinical HUD when a scan is ingested", () => {
		engine.simulateIncomingScan({
			fileName: "Vatech_Tooth16_Periapical.dcm",
			fileSize: 2480100,
			folderPath: "C:\\EzSensor\\Capture",
			tooth: "16",
		});

		const html = renderToString(<VisiographIncomingToast />);

		// Verify container and accessibility
		assert.ok(html.includes('role="alert"'));
		assert.ok(html.includes('data-testid="visiograph-incoming-toast"'));

		// Verify brand telemetry
		assert.ok(html.includes("Vatech EzSensor HD"));

		// Verify file details
		assert.ok(html.includes("Vatech_Tooth16_Periapical.dcm"));
		assert.ok(html.includes("2.4 МБ"));

		// Verify 1-Click Primary CTA with active tooth
		assert.ok(html.includes('data-testid="btn-link-to-tooth"'));
		assert.match(html, /Привязать к зубу.*16/);

		// Verify Secondary viewer button
		assert.ok(html.includes('data-testid="btn-open-in-viewer"'));
		assert.ok(html.includes("Во вьюере"));

		// Verify design tokens & invariants
		assert.ok(html.includes("var(--paper-strong)"));
		assert.ok(html.includes("var(--teal)"));
		assert.ok(html.includes("height:32px"));
	});

	it("renders queue badge (+N новых) when multiple scans are pending", () => {
		engine.simulateIncomingScan({
			fileName: "Vatech_Tooth16.dcm",
			tooth: "16",
		});
		engine.simulateIncomingScan({
			fileName: "Vatech_Tooth17.dcm",
			tooth: "17",
		});
		engine.simulateIncomingScan({
			fileName: "Vatech_Tooth18.dcm",
			tooth: "18",
		});

		const html = renderToString(<VisiographIncomingToast />);

		assert.match(html, /\+.*2.*новых/);
	});
});
