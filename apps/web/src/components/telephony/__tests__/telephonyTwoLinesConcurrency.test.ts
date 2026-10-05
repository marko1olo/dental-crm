import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
	formatPhoneDisplay,
	fuzzyMatchPhone,
	normalizePhoneDigits,
	useTelephonyStore,
} from "../../../store/telephonyStore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const telephonyDir = path.resolve(__dirname, "..");

describe("Telephony Two-Line Concurrency & Store State Invariants", () => {
	// Reset store before test
	useTelephonyStore.setState({
		activeCall: null,
		callHistory: [],
		activeLineId: 1,
		isHeld: false,
		line1: { lineId: 1, call: null, state: "idle", durationSeconds: 0, isMuted: false },
		line2: { lineId: 2, call: null, state: "idle", durationSeconds: 0, isMuted: false },
	});

	it("1. Routing concurrent calls across line 1 and line 2", () => {
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
		// Item-target at index 1 must be answered, while item-newest stays ringing
		assert.equal(history[0]?.id, "item-newest");
		assert.equal(history[0]?.status, "ringing");
		assert.equal(history[1]?.id, "item-target");
		assert.equal(history[1]?.status, "answered");
	});

	it("3. Rapid duplicate ringing event suppression within 2 seconds", () => {
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

	it("4. Phone formatting and fuzzy matching invariants", () => {
		assert.equal(normalizePhoneDigits("+7 (916) 123-45-67"), "79161234567");
		assert.equal(fuzzyMatchPhone("+7 (916) 123-45-67", "89161234567"), true);
		assert.equal(fuzzyMatchPhone("9161234567", "79161234567"), true);
		assert.equal(fuzzyMatchPhone("+7 (999) 000-00-00", "+7 (999) 111-11-11"), false);

		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("89161234567"), "+7 (916) 123-45-67");
	});

	it("5. Anti-Matryoshka two-line UI contracts in IncomingCallPopup and TelephonyWidgetHeader", () => {
		const popupSource = fs.readFileSync(path.join(telephonyDir, "IncomingCallPopup.tsx"), "utf-8");
		const headerSource = fs.readFileSync(path.join(telephonyDir, "TelephonyWidgetHeader.tsx"), "utf-8");
		const moreMenuSource = fs.readFileSync(path.join(telephonyDir, "IncomingCallBadgeMoreMenu.tsx"), "utf-8");

		// Anti-Matryoshka banner in expanded badge
		assert.ok(
			popupSource.includes('data-testid="incoming-secondary-line-banner"'),
			"IncomingCallPopup must include secondary line banner rather than launching nested modals",
		);
		assert.ok(
			popupSource.includes('data-testid="answer-secondary-line-btn"'),
			"IncomingCallPopup must provide 1-tap answer button with automatic hold on active line",
		);
		assert.ok(
			popupSource.includes('data-testid="capsule-switch-secondary-line-btn"'),
			"IncomingCallPopup capsule must show secondary incoming line pill",
		);

		// TelephonyWidgetHeader two-line tabs
		assert.ok(
			headerSource.includes("line1") && headerSource.includes("line2"),
			"TelephonyWidgetHeader must accept line1 and line2 props for concurrent line visualization",
		);

		// 1-tap callback in more menu
		assert.ok(
			moreMenuSource.includes('data-testid="badge-action-callback-15m"'),
			"IncomingCallBadgeMoreMenu must provide 1-tap 'Перезвонить через 15 мин' action",
		);
	});

	it("6. Solo-doctor sovereignty: 1-click callback 15m scheduling calculation", () => {
		useTelephonyStore.setState({
			callHistory: [],
			activeCall: null,
		});

		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-busy-chair",
			phone: "+79991234567",
			patientId: null,
			patientName: "Срочный Пациент",
			status: "ringing",
		});

		const before = Date.now();
		useTelephonyStore.getState().recordCallOutcome("callback_15m");
		const history = useTelephonyStore.getState().callHistory;

		assert.equal(history.length, 1);
		assert.equal(history[0]?.outcome, "callback_15m");
		assert.ok(history[0]?.callbackDueAt, "callbackDueAt must be defined");

		const dueTime = new Date(history[0]!.callbackDueAt!).getTime();
		const expectedMinTime = before + 15 * 60 * 1000 - 1000;
		const expectedMaxTime = Date.now() + 15 * 60 * 1000 + 1000;
		assert.ok(
			dueTime >= expectedMinTime && dueTime <= expectedMaxTime,
			"callbackDueAt must be scheduled exactly 15 minutes into the future",
		);
	});
});
