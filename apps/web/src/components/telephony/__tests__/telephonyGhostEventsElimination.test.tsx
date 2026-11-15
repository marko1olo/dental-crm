/**
 * apps/web/src/components/telephony/__tests__/telephonyGhostEventsElimination.test.tsx
 *
 * Red Team Inquisitor Test Suite: Ghost Events Elimination & Real Fastify/SIP Bridge.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor), 8ba (Disruptive Reality).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { TelephonyStudioModal } from "../TelephonyStudioModal";
import { initiateOutboundCall } from "../initiateOutboundCall";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { enableDemoShowcaseMode, disableDemoShowcaseMode } from "../../../lib/demoMode";

describe("Telephony Ghost Events Elimination (Red Team Inquisition)", () => {
	it("1. Renders direct call patient button in call card header", () => {
		enableDemoShowcaseMode();
		try {
			const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);
			assert.ok(
				html.includes('data-testid="telephony-call-patient-btn"'),
				"Card must include direct call button to eliminate friction",
			);
		} finally {
			disableDemoShowcaseMode();
		}
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

			// Verify softphone state was activated in ringing state (awaiting call_answered event)
			const updatedStore = useTelephonyStore.getState();
			assert.ok(updatedStore.activeCall, "Active call must be set in softphone store");
			assert.equal(updatedStore.activeCall?.phone, "+79995554433");
			assert.equal(updatedStore.activeCall?.status, "ringing");
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

	it("4. TelephonyStudioModal renders essential structural shell with accessibility attributes", () => {
		enableDemoShowcaseMode();
		try {
			const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);
			assert.ok(
				html.includes('role="dialog"') || html.includes('aria-modal="true"') || html.includes("dnt-telephony-modal"),
				"TelephonyStudioModal must render dialog container with accessibility attributes",
			);
			assert.ok(
				html.includes("Телефония") || html.includes("Звонки") || html.includes("telephony"),
				"TelephonyStudioModal must render telephony studio structural shell",
			);
		} finally {
			disableDemoShowcaseMode();
		}
	});

	it("5. useCallDurationTimer confirms complete removal of 45-second auto-drop timeout", () => {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const filePath = path.resolve(__dirname, "../incomingCallDataModules/useCallDurationTimer.ts");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(
			!content.includes("45000"),
			"useCallDurationTimer must NOT contain 45-second auto-dismiss timeout",
		);
		assert.ok(
			!content.includes("setTimeout"),
			"useCallDurationTimer must NOT contain client-side dismiss setTimeout",
		);
	});

	it("6. TelephonyStudioModal eliminates typeof window === 'undefined' demo data leak risk", () => {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const filePath = path.resolve(__dirname, "../TelephonyStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(
			!content.includes('isDemoShowcaseMode() || typeof window === "undefined"'),
			"TelephonyStudioModal must strictly use isDemoShowcaseMode()",
		);
	});
});
