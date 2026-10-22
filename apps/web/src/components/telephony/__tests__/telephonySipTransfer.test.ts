import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { useTelephonyStore } from "../../../store/telephonyStore.js";

describe("Telephony: SIP Call Transfer (Blind vs Attended)", () => {
	test("startCallTransfer with blind transfer transfers call immediately", () => {
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
	});

	test("startCallTransfer with attended transfer keeps activeCall until complete", () => {
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
