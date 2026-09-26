import assert from "node:assert/strict";
import test from "node:test";
import {
	formatPhoneDisplay,
	fuzzyMatchPhone,
	normalizePhoneDigits,
	useTelephonyStore,
} from "../../../store/telephonyStore";

test("Telephony Two-Line Concurrency & Store State Invariants", async (t) => {
	// Reset store before test
	useTelephonyStore.setState({
		activeCall: null,
		callHistory: [],
		activeLineId: 1,
		isHeld: false,
		line1: { lineId: 1, call: null, state: "idle", durationSeconds: 0, isMuted: false },
		line2: { lineId: 2, call: null, state: "idle", durationSeconds: 0, isMuted: false },
	});

	await t.test("1. Routing concurrent calls across line 1 and line 2", () => {
		const store = useTelephonyStore.getState();

		// Trigger Call 1
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

		// Answer Call 1
		useTelephonyStore.getState().answerCall();
		const answeredCall1 = useTelephonyStore.getState();
		assert.equal(answeredCall1.line1.state, "connected");
		assert.equal(answeredCall1.activeCall?.status, "answered");

		// Trigger concurrent Call 2 on another line
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-leg-2",
			phone: "+79169998877",
			patientId: null,
			patientName: "Новый Лид",
			provider: "mango",
		});

		const afterCall2 = useTelephonyStore.getState();
		// Line 1 remains connected!
		assert.equal(afterCall2.line1.state, "connected");
		assert.equal(afterCall2.line1.call?.callId, "call-leg-1");
		// Line 2 receives the second call in ringing state
		assert.equal(afterCall2.line2.state, "ringing");
		assert.equal(afterCall2.line2.call?.callId, "call-leg-2");

		// Switch to line 2: line 1 must automatically transition to held
		useTelephonyStore.getState().switchLine(2);
		const afterSwitch = useTelephonyStore.getState();
		assert.equal(afterSwitch.activeLineId, 2);
		assert.equal(afterSwitch.line1.state, "held");
		assert.equal(afterSwitch.activeCall?.callId, "call-leg-2");

		// Reject call 2: line 2 clears, line 1 is still preserved in held
		useTelephonyStore.getState().rejectCall();
		const afterReject2 = useTelephonyStore.getState();
		assert.equal(afterReject2.line2.state, "idle");
		assert.equal(afterReject2.line1.state, "held");

		// Switch back to line 1 and unhold
		useTelephonyStore.getState().switchLine(1);
		useTelephonyStore.getState().unholdCall();
		const afterReturn1 = useTelephonyStore.getState();
		assert.equal(afterReturn1.activeLineId, 1);
		assert.equal(afterReturn1.line1.state, "connected");
		assert.equal(afterReturn1.isHeld, false);

		// End call 1
		useTelephonyStore.getState().endCall("https://pbx.example.com/rec.mp3");
		const afterEnd1 = useTelephonyStore.getState();
		assert.equal(afterEnd1.activeCall, null);
		assert.equal(afterEnd1.line1.state, "idle");
	});

	await t.test("2. History matching updates item by callId rather than index 0", () => {
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
		// Item-target at index 1 must be answered, while item-newest stays ringing
		assert.equal(history[0]?.id, "item-newest");
		assert.equal(history[0]?.status, "ringing");
		assert.equal(history[1]?.id, "item-target");
		assert.equal(history[1]?.status, "answered");
	});

	await t.test("3. Rapid duplicate ringing event suppression within 2 seconds", () => {
		useTelephonyStore.setState({
			callHistory: [],
			line1: { lineId: 1, call: null, state: "idle", durationSeconds: 0, isMuted: false },
			line2: { lineId: 2, call: null, state: "idle", durationSeconds: 0, isMuted: false },
		});

		const callData = {
			callId: "dup-call-100",
			phone: "+79998887766",
			patientId: null,
			patientName: "Повторный вызов",
		};

		// First trigger
		useTelephonyStore.getState().triggerIncomingCall(callData);
		assert.equal(useTelephonyStore.getState().callHistory.length, 1);

		// Rapid repeat trigger immediately (e.g. 50ms later from duplicate PBX webhook)
		useTelephonyStore.getState().triggerIncomingCall(callData);
		assert.equal(useTelephonyStore.getState().callHistory.length, 1);
	});

	await t.test("4. Phone formatting and fuzzy matching invariants", () => {
		assert.equal(normalizePhoneDigits("+7 (916) 123-45-67"), "79161234567");
		assert.equal(fuzzyMatchPhone("+7 (916) 123-45-67", "89161234567"), true);
		assert.equal(fuzzyMatchPhone("9161234567", "79161234567"), true);
		assert.equal(fuzzyMatchPhone("+7 (999) 000-00-00", "+7 (999) 111-11-11"), false);

		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("89161234567"), "+7 (916) 123-45-67");
	});
});
