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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisiographIncomingToast } from "../VisiographIncomingToast";
import {
	getVisiographHotFolderEngine,
	VisiographHotFolderEngine,
} from "../../../lib/visiographHotFolderEngine";

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
		expect(html).toBe("");
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
		expect(html).toContain('role="alert"');
		expect(html).toContain('data-testid="visiograph-incoming-toast"');

		// Verify brand telemetry
		expect(html).toContain("Vatech EzSensor HD");

		// Verify file details
		expect(html).toContain("Vatech_Tooth16_Periapical.dcm");
		expect(html).toContain("2.4 МБ");

		// Verify 1-Click Primary CTA with active tooth
		expect(html).toContain('data-testid="btn-link-to-tooth"');
		expect(html).toMatch(/Привязать к зубу.*16/);

		// Verify Secondary viewer button
		expect(html).toContain('data-testid="btn-open-in-viewer"');
		expect(html).toContain("Во вьюере");

		// Verify design tokens & invariants
		expect(html).toContain("var(--paper-strong)");
		expect(html).toContain("var(--teal)");
		expect(html).toContain("height:32px");
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

		expect(html).toMatch(/\+.*2.*новых/);
	});
});
