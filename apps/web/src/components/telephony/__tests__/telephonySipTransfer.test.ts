import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { useTelephonyStore } from "../../../store/telephonyStore.js";

describe("Telephony: SIP Call Transfer (Blind vs Attended)", () => {
	const originalFetch = globalThis.fetch;
	const dispatchedRequests: Array<{ url: string; method: string; body: any }> = [];

	beforeEach(() => {
		dispatchedRequests.length = 0;
		globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
			const bodyStr = init?.body ? String(init.body) : "";
			let parsedBody = null;
			try {
				parsedBody = JSON.parse(bodyStr);
			} catch {
				parsedBody = bodyStr;
			}
			dispatchedRequests.push({
				url: String(url),
				method: init?.method || "GET",
				body: parsedBody,
			});
			return {
				ok: true,
				status: 200,
				json: async () => ({ success: true, status: "transferred" }),
				text: async () => JSON.stringify({ success: true }),
			} as Response;
		}) as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test("startCallTransfer with blind transfer transfers call immediately and dispatches POST /api/telephony/sip/transfer", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-trans-1",
			phone: "+79261112233",
			patientId: null,
			patientName: "Пациент для перевода",
			status: "answered",
			timestamp: new Date().toISOString(),
		});

		assert.ok(useTelephonyStore.getState().activeCall);

		useTelephonyStore.getState().startCallTransfer("102", "blind");

		const state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null, "Active call cleared on blind transfer");
		assert.equal(state.transferState.isTransferring, true);
		assert.equal(state.transferState.targetExtension, "102");
		assert.equal(state.transferState.transferType, "blind");
		assert.equal(state.transferState.status, "transferred");

		const historyItem = state.callHistory[0];
		assert.equal(historyItem?.actionTaken, "transferred");
		assert.equal(historyItem?.transferTarget, "102");

		// Verify real network dispatch (SEV-1 Elimination)
		const transferReq = dispatchedRequests.find((r) => r.url === "/api/telephony/sip/transfer");
		assert.ok(transferReq, "Must dispatch POST /api/telephony/sip/transfer");
		assert.equal(transferReq.method, "POST");
		assert.equal(transferReq.body?.callId, "call-trans-1");
		assert.equal(transferReq.body?.targetExtensionOrPhone, "102");
		assert.equal(transferReq.body?.transferType, "blind");
	});

	test("startCallTransfer with attended transfer keeps activeCall until complete, then dispatches attended transfer", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-trans-2",
			phone: "+79269998877",
			patientId: null,
			patientName: "Пациент Attended",
			status: "answered",
			timestamp: new Date().toISOString(),
		});

		useTelephonyStore.getState().startCallTransfer("101", "attended");

		let state = useTelephonyStore.getState();
		assert.ok(state.activeCall, "Active call remains during attended consultation");
		assert.equal(state.transferState.transferType, "attended");
		assert.equal(state.transferState.status, "dialing");

		useTelephonyStore.getState().completeCallTransfer();
		state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null, "Active call cleared on transfer completion");
		assert.equal(state.transferState.status, "transferred");

		// Verify attended network dispatch
		const attendedReq = dispatchedRequests.find(
			(r) => r.url === "/api/telephony/sip/transfer" && r.body?.transferType === "attended",
		);
		assert.ok(attendedReq, "Must dispatch attended POST /api/telephony/sip/transfer on complete");
		assert.equal(attendedReq.body?.callId, "call-trans-2");
		assert.equal(attendedReq.body?.targetExtensionOrPhone, "101");
	});

	test("cancelCallTransfer restores transferState to idle without dropping call", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-trans-3",
			phone: "+79265554433",
			patientId: null,
			patientName: "Пациент Отмена",
			status: "answered",
			timestamp: new Date().toISOString(),
		});

		useTelephonyStore.getState().startCallTransfer("103", "attended");
		assert.equal(useTelephonyStore.getState().transferState.targetExtension, "103");

		useTelephonyStore.getState().cancelCallTransfer();
		const state = useTelephonyStore.getState();
		assert.equal(state.transferState.isTransferring, false);
		assert.equal(state.transferState.status, "idle");
		assert.ok(state.activeCall, "Active call remains intact");
		useTelephonyStore.getState().rejectCall();
	});
});
