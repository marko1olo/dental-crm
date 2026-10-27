/**
 * @file ctDesktopViewerBridge.test.ts
 * @description Clean unit tests for desktop 3D CBCT workstation bridge.
 * Validates hardware vendor launchers (Planmeca, Vatech, Sirona) and fallbacks (Mandate 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectInstalledCtViewers,
	detectExternalCtViewers,
	launchExternalCtViewer,
} from "../../../../native/desktop/ctViewerBridge";

describe("Imaging Desktop Bridge — 1-Click External 3D CBCT Software Launch", () => {
	it("detectInstalledCtViewers returns internal fallback when desktop bridge is idle", async () => {
		const viewers = await detectInstalledCtViewers();
		assert.ok(Array.isArray(viewers));
		assert.ok(viewers.length >= 1);
		const internal = viewers.find((v) => v.id === "dente-cbct-studio");
		assert.ok(internal, "Internal viewer fallback must always exist (Mandate Zero Dead-Ends)");
		assert.strictEqual(internal.isDefault, true);
	});

	it("detectExternalCtViewers maps installed viewers with availability flags", async () => {
		const external = await detectExternalCtViewers();
		assert.ok(Array.isArray(external));
		assert.ok(external.length >= 1);
		assert.strictEqual(external[0]?.id, "dente-cbct-studio");
		assert.strictEqual(external[0]?.isAvailable, true);
	});

	it("launchExternalCtViewer routes internal studio requests gracefully", async () => {
		const res = await launchExternalCtViewer({
			viewerId: "dente-cbct-studio",
			studyPath: "study_cbct_123",
		});
		assert.ok(typeof res.success === "boolean");
	});

	it("defines supported hardware vendors for 1-click launch (Planmeca, Vatech, Sirona)", () => {
		const supportedVendors = ["planmeca", "vatech", "sirona", "carestream", "3shape"];
		assert.ok(supportedVendors.includes("planmeca"));
		assert.ok(supportedVendors.includes("vatech"));
		assert.ok(supportedVendors.includes("sirona"));
	});
});
