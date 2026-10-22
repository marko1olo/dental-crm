import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { TelephonyToast } from "../TelephonyToast";
import { TelephonyDialpadModal } from "../TelephonyDialpadModal";
import type { IncomingCallPayload } from "../../../store/telephonyStore";

describe("TelephonyToast & Dialpad Inquisitor Suite (Zero Simulators & Mandates 8e, 8n)", () => {
	const sampleIncomingCall: IncomingCallPayload = {
		callId: "test-call-123",
		phone: "+7 (926) 555-12-34",
		patientName: "Смирнова Екатерина Васильевна",
		patientId: "PAT-001",
		provider: "mango",
		status: "ringing",
		callStartedAt: Date.now() - 5000,
	};

	it("1. TelephonyToast renders express card with patient name, balance, and last visit", () => {
		const html = renderToString(
			<TelephonyToast
				call={sampleIncomingCall}
				suppressInSterileZone={false}
			/>,
		);

		assert.ok(html.includes("Смирнова Екатерина Васильевна"), "Toast must display caller patient name");
		assert.ok(html.includes("+7 (926) 555-12-34") || html.includes("555-12-34"), "Toast must display phone number");
		assert.ok(html.includes("MANGO"), "Toast must display telephony provider");
		assert.ok(html.includes("Баланс:"), "Toast must display patient financial balance");
		assert.ok(html.includes("Визит:"), "Toast must display last visit information");
	});

	it("2. TelephonyToast has 1-click action buttons that are NEVER disabled (Mandate 8e)", () => {
		const html = renderToString(
			<TelephonyToast
				call={sampleIncomingCall}
				suppressInSterileZone={false}
			/>,
		);

		assert.ok(html.includes("data-testid=\"toast-action-open-card\""), "Toast must provide open card button");
		assert.ok(html.includes("data-testid=\"toast-action-quick-book\""), "Toast must provide quick book button");
		assert.ok(html.includes("data-testid=\"toast-action-answer\""), "Toast must provide answer button");
		assert.ok(html.includes("data-testid=\"toast-action-reject\""), "Toast must provide reject button");

		// Mandate 8e: Buttons are never disabled
		assert.ok(!html.includes("disabled"), "Toast action buttons must never be disabled");
	});

	it("3. TelephonyToast returns null when no active call is present", () => {
		const html = renderToString(
			<TelephonyToast
				call={null}
				suppressInSterileZone={false}
			/>,
		);

		assert.equal(html, "", "Toast must return null when call is null");
	});

	it("4. TelephonyDialpadModal is cleanly exported and renders properly", () => {
		const html = renderToString(
			<TelephonyDialpadModal
				isOpen={true}
				onClose={() => {}}
				initialPhone="+79265551234"
			/>,
		);

		assert.ok(html.includes("data-testid=\"telephony-dialer-modal\""), "Dialpad modal must mount");
		assert.ok(html.includes("Набор номера"), "Dialpad modal must have dialer tab");
	});
});
