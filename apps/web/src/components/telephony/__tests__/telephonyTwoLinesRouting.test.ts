import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { useTelephonyStore } from "../../../store/telephonyStore";

describe("Telephony Two-Line Concurrency & Routing", () => {
	useTelephonyStore.setState({
		activeCall: null,
		callHistory: [],
		activeLineId: 1,
		isHeld: false,
		line1: { lineId: 1, call: null, state: "idle", durationSeconds: 0, isMuted: false },
		line2: { lineId: 2, call: null, state: "idle", durationSeconds: 0, isMuted: false },
	});

	it("1. Routing concurrent calls across line 1 and line 2", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-leg-1",
			phone: "+79161112233",
			patientId: "patient-1",
			patientName: "Пациент Первый",
			provider: "uis",
		});

		const afterCall1 = useTelephonyStore.getState();
		assert.equal(afterCall1.activeLineId, 1);
		assert.equal(afterCall1.line1.state, "ringing");
		assert.equal(afterCall1.line1.call?.callId, "call-leg-1");
		assert.equal(afterCall1.line2.state, "idle");

		useTelephonyStore.getState().answerCall();
		const answeredCall1 = useTelephonyStore.getState();
		assert.equal(answeredCall1.line1.state, "connected");
		assert.equal(answeredCall1.activeCall?.status, "answered");

		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-leg-2",
			phone: "+79169998877",
			patientId: null,
			patientName: "Новый Лид",
			provider: "mango",
		});

		const afterCall2 = useTelephonyStore.getState();
		assert.equal(afterCall2.line1.state, "connected");
		assert.equal(afterCall2.line1.call?.callId, "call-leg-1");
		assert.equal(afterCall2.line2.state, "ringing");
		assert.equal(afterCall2.line2.call?.callId, "call-leg-2");

		useTelephonyStore.getState().switchLine(2);
		const afterSwitch = useTelephonyStore.getState();
		assert.equal(afterSwitch.activeLineId, 2);
		assert.equal(afterSwitch.line1.state, "held");
		assert.equal(afterSwitch.activeCall?.callId, "call-leg-2");

		useTelephonyStore.getState().rejectCall();
		const afterReject2 = useTelephonyStore.getState();
		assert.equal(afterReject2.line2.state, "idle");
		assert.equal(afterReject2.line1.state, "held");

		useTelephonyStore.getState().switchLine(1);
		useTelephonyStore.getState().unholdCall();
		const afterReturn1 = useTelephonyStore.getState();
		assert.equal(afterReturn1.activeLineId, 1);
		assert.equal(afterReturn1.line1.state, "connected");
		assert.equal(afterReturn1.isHeld, false);

		useTelephonyStore.getState().endCall("https://pbx.example.com/rec.mp3");
		const afterEnd1 = useTelephonyStore.getState();
		assert.equal(afterEnd1.activeCall, null);
		assert.equal(afterEnd1.line1.state, "idle");
	});

	it("2. History matching updates item by callId rather than index 0", () => {
		useTelephonyStore.setState({
			callHistory: [
				{
					id: "item-newest",
					callId: "call-newest",
					phone: "+79001112233",
					patientId: null,
					patientName: "Новый",
					status: "ringing",
				},
				{
					id: "item-target",
					callId: "call-target",
					phone: "+79005556677",
					patientId: "patient-target",
					patientName: "Целевой Пациент",
					status: "ringing",
				},
			],
			activeCall: {
				id: "item-target",
				callId: "call-target",
				phone: "+79005556677",
				patientId: "patient-target",
				patientName: "Целевой Пациент",
				status: "ringing",
			},
			activeLineId: 1,
		});

		useTelephonyStore.getState().answerCall();

		const history = useTelephonyStore.getState().callHistory;
		assert.equal(history[0]?.id, "item-newest");
		assert.equal(history[0]?.status, "ringing");
		assert.equal(history[1]?.id, "item-target");
		assert.equal(history[1]?.status, "answered");
	});
});
