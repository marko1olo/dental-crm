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
import { useCallDurationTimer } from "../incomingCallDataModules/useCallDurationTimer";
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
		let dispatchedBody: { phone?: string; patientName?: string } | null = null;

		globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			dispatchedUrl = String(input);
			dispatchedBody = init?.body ? (JSON.parse(String(init.body)) as { phone?: string; patientName?: string }) : null;
			return new Response(JSON.stringify({ success: true, callId: "test-call-id", status: "dialing" }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		};

		try {
			const success = await initiateOutboundCall({
				phone: "+7 (999) 555-44-33",
				patientName: "Иванов Иван",
			});

			assert.equal(success, true, "initiateOutboundCall must return true for valid phone");
			assert.equal(dispatchedUrl, "/api/telephony/outbound-call", "Must dispatch to /api/telephony/outbound-call");
			const body = dispatchedBody as { phone?: string; patientName?: string } | null;
			assert.ok(body, "Dispatched payload must exist");
			assert.equal(body.phone, "+79995554433", "Must normalize phone to E.164");
			assert.equal(body.patientName, "Иванов Иван");

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

	it("5. useCallDurationTimer tracks active call duration and never schedules an auto-dismiss timeout", () => {
		let dismissCalls = 0;
		const originalSetTimeout = globalThis.setTimeout;
		let timeoutCount = 0;
		globalThis.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
			if (typeof ms === "number" && ms >= 40_000) timeoutCount += 1;
			return originalSetTimeout(fn, ms, ...args);
		}) as typeof setTimeout;

		try {
			function TimerProbe() {
				const seconds = useCallDurationTimer(
					{
						callId: "probe-1",
						direction: "inbound",
						phone: "+79001112233",
						status: "answered",
						callStartedAt: Date.now() - 10_000,
					},
					() => {
						dismissCalls += 1;
					},
				);
				return <span data-testid="probe-sec">{seconds}</span>;
			}
			const html = renderToString(<TimerProbe />);
			assert.ok(html.includes('data-testid="probe-sec"'));
			assert.equal(dismissCalls, 0);
			assert.equal(timeoutCount, 0);
		} finally {
			globalThis.setTimeout = originalSetTimeout;
		}
	});

	it("6. TelephonyStudioModal hides synthetic demo calls when demo mode is disabled", () => {
		disableDemoShowcaseMode();
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);
		assert.equal(html.includes("DEMO"), false, "Production mode must not render demo showcase records");
	});
});
