import assert from "node:assert/strict";
import { test } from "vitest";
import { useTelephonyStore } from "../../../store/telephonyStore";

test("Telephony - incoming call lifecycle and store transitions", () => {
	useTelephonyStore.getState().clearHistory();

	useTelephonyStore.getState().triggerIncomingCall({
		callId: "call-live-1",
		phone: "+79261112233",
		patientId: "pat-1",
		patientName: "Елена Соколова",
		provider: "mango",
		timestamp: new Date().toISOString(),
		status: "ringing",
	});

	let active = useTelephonyStore.getState().activeCall;
	assert.ok(active !== null);
	assert.strictEqual(active?.status, "ringing");
	assert.strictEqual(active?.patientName, "Елена Соколова");

	useTelephonyStore.getState().answerCall();
	active = useTelephonyStore.getState().activeCall;
	assert.strictEqual(active?.status, "answered");

	useTelephonyStore.getState().acceptCall();
	assert.strictEqual(useTelephonyStore.getState().activeCall, null);

	const history = useTelephonyStore.getState().callHistory;
	assert.strictEqual(history.length, 1);
	assert.strictEqual(history[0]?.status, "answered");
	assert.strictEqual(history[0]?.actionTaken, "accepted");
});

test("Telephony - connectCall keeps call active in connected status without destroying activeCall", () => {
	useTelephonyStore.getState().clearHistory();

	useTelephonyStore.getState().triggerIncomingCall({
		callId: "call-connect-test",
		phone: "+79269998877",
		patientId: "pat-99",
		patientName: "Михаил Васильев",
		provider: "mango",
		status: "ringing",
	});

	let active = useTelephonyStore.getState().activeCall;
	assert.ok(active !== null);
	assert.strictEqual(active?.status, "ringing");

	useTelephonyStore.getState().connectCall();
	active = useTelephonyStore.getState().activeCall;
	assert.ok(active !== null);
	assert.strictEqual(active?.status, "connected");

	const historyItem = useTelephonyStore.getState().callHistory[0];
	assert.strictEqual(historyItem?.status, "connected");

	useTelephonyStore.getState().dismissCall();
});

test("Telephony - agent readiness states and line switching", () => {
	assert.strictEqual(useTelephonyStore.getState().agentState, "online");

	useTelephonyStore.getState().setAgentState("dnd");
	assert.strictEqual(useTelephonyStore.getState().agentState, "dnd");

	useTelephonyStore.getState().setAgentState("pause");
	assert.strictEqual(useTelephonyStore.getState().agentState, "pause");

	useTelephonyStore.getState().setAgentState("online");
	assert.strictEqual(useTelephonyStore.getState().agentState, "online");

	assert.strictEqual(useTelephonyStore.getState().activeLineId, 1);

	useTelephonyStore.getState().switchLine(2);
	assert.strictEqual(useTelephonyStore.getState().activeLineId, 2);

	useTelephonyStore.getState().switchLine(1);
	assert.strictEqual(useTelephonyStore.getState().activeLineId, 1);

	assert.strictEqual(useTelephonyStore.getState().isHeld, false);

	useTelephonyStore.getState().holdCall();
	assert.strictEqual(useTelephonyStore.getState().isHeld, true);

	useTelephonyStore.getState().unholdCall();
	assert.strictEqual(useTelephonyStore.getState().isHeld, false);

	useTelephonyStore.getState().toggleHold();
	assert.strictEqual(useTelephonyStore.getState().isHeld, true);

	useTelephonyStore.getState().toggleHold();
	assert.strictEqual(useTelephonyStore.getState().isHeld, false);
});
