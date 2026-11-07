/**
 * apps/web/src/components/telephony/__tests__/telephonyGhostEventsElimination.test.tsx
 *
 * Red Team Inquisitor Test Suite: Ghost Events Elimination & Real Fastify/SIP Bridge.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor), 8ba (Disruptive Reality).
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { TelephonyStudioModal } from "../TelephonyStudioModal";
import { initiateOutboundCall } from "../initiateOutboundCall";
import { useTelephonyStore } from "../../../store/telephonyStore";

describe("Telephony Ghost Events Elimination (Red Team Inquisition)", () => {
	it("1. Renders direct call patient button in call card header", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);
		assert.ok(
			html.includes('data-testid="telephony-call-patient-btn"'),
			"Card must include direct call button to eliminate friction",
		);
	});

	it("2. initiateOutboundCall validates phone, activates softphone HUD and dispatches outbound call", async () => {
		const store = useTelephonyStore.getState();
		store.closeCallDrawer();

		// Intercept global fetch
		const originalFetch = globalThis.fetch;
		let dispatchedUrl = "";
		let dispatchedBody: any = null;

		globalThis.fetch = (async (url: any, opts: any) => {
			dispatchedUrl = String(url);
			dispatchedBody = opts?.body ? JSON.parse(opts.body) : null;
			return {
				ok: true,
				status: 200,
				json: async () => ({ success: true, callId: "test-call-id", status: "dialing" }),
			};
		}) as any;

		try {
			const success = await initiateOutboundCall({
				phone: "+7 (999) 555-44-33",
				patientName: "Иванов Иван",
			});

			assert.equal(success, true, "initiateOutboundCall must return true for valid phone");
			assert.equal(dispatchedUrl, "/api/telephony/outbound-call", "Must dispatch to /api/telephony/outbound-call");
			assert.equal(dispatchedBody?.phone, "+79995554433", "Must normalize phone to E.164");
			assert.equal(dispatchedBody?.patientName, "Иванов Иван");

			// Verify softphone state was activated
			const updatedStore = useTelephonyStore.getState();
			assert.ok(updatedStore.activeCall, "Active call must be set in softphone store");
			assert.equal(updatedStore.activeCall?.phone, "+79995554433");
			assert.equal(updatedStore.activeCall?.status, "connected");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("3. initiateOutboundCall rejects invalid phone numbers gracefully without throwing", async () => {
		const resultEmpty = await initiateOutboundCall({ phone: "" });
		assert.equal(resultEmpty, false);

		const resultShort = await initiateOutboundCall({ phone: "12" });
		assert.equal(resultShort, false);
	});

	it("4. TelephonyStudioModal maintains 400-470 line sweet spot (Mandate 8b)", () => {
		const fs = require("node:fs");
		const path = require("node:path");
		const filePath = path.resolve(
			process.cwd(),
			"apps/web/src/components/telephony/TelephonyStudioModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");
		const lineCount = content.split("\n").length;
		assert.ok(
			lineCount >= 400 && lineCount <= 470,
			`TelephonyStudioModal line count (${lineCount}) must be within 400..470 sweet spot`,
		);
	});
});
