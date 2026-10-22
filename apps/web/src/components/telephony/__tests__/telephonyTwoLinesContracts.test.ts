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

describe("Telephony Two-Line Contracts & Solo Doctor Sovereignty", () => {
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

		useTelephonyStore.getState().triggerIncomingCall(callData);
		assert.equal(useTelephonyStore.getState().callHistory.length, 1);

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
		const contextCardSource = fs.readFileSync(path.join(telephonyDir, "incomingCallPopupModules/IncomingCallPatientContextCard.tsx"), "utf-8");
		const headerBarSource = fs.readFileSync(path.join(telephonyDir, "incomingCallPopupModules/IncomingCallHeaderBar.tsx"), "utf-8");
		const headerSource = fs.readFileSync(path.join(telephonyDir, "TelephonyWidgetHeader.tsx"), "utf-8");
		const moreMenuSource = fs.readFileSync(path.join(telephonyDir, "IncomingCallBadgeMoreMenu.tsx"), "utf-8");

		assert.ok(contextCardSource.includes('data-testid="incoming-secondary-line-banner"'));
		assert.ok(contextCardSource.includes('data-testid="answer-secondary-line-btn"'));
		assert.ok(headerBarSource.includes('data-testid="capsule-switch-secondary-line-btn"'));
		assert.ok(headerSource.includes("line1") && headerSource.includes("line2"));
		assert.ok(moreMenuSource.includes('data-testid="badge-action-callback-15m"'));
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
		assert.ok(history[0]?.callbackDueAt);

		const dueTime = new Date(history[0]!.callbackDueAt!).getTime();
		const expectedMinTime = before + 15 * 60 * 1000 - 1000;
		const expectedMaxTime = Date.now() + 15 * 60 * 1000 + 1000;
		assert.ok(dueTime >= expectedMinTime && dueTime <= expectedMaxTime);
	});
});
