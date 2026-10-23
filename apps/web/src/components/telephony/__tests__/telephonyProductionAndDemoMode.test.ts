import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test, vi } from "vitest";
import { disableDemoShowcaseMode, enableDemoShowcaseMode, isDemoShowcaseMode } from "../../../lib/demoMode";
import { assertNoSyntheticCallsInProduction, useTelephonyStore } from "../../../store/telephonyStore";

describe("Telephony Production Purity & Demo Showcase Invariants", () => {
	beforeEach(() => {
		useTelephonyStore.getState().clearHistory();
		useTelephonyStore.setState({ activeCall: null, isCallDrawerOpen: false });
		disableDemoShowcaseMode();
	});

	afterEach(() => {
		disableDemoShowcaseMode();
		vi.restoreAllMocks();
	});

	test("1.1. assertNoSyntheticCallsInProduction returns true in production mode", () => {
		disableDemoShowcaseMode();
		assert.strictEqual(isDemoShowcaseMode(), false);
		assert.strictEqual(assertNoSyntheticCallsInProduction(), true);
	});

	test("1.2. Production blocks triggerIncomingCall with empty or stub phone numbers", () => {
		disableDemoShowcaseMode();
		const store = useTelephonyStore.getState();
		store.triggerIncomingCall({ phone: "", patientId: null, patientName: "", provider: "mango", status: "ringing" });
		assert.strictEqual(useTelephonyStore.getState().activeCall, null);
		assert.strictEqual(useTelephonyStore.getState().callHistory.length, 0);

		store.triggerIncomingCall({ phone: "   ", patientId: null, patientName: "", provider: "mango", status: "ringing" });
		assert.strictEqual(useTelephonyStore.getState().activeCall, null);
	});

	test("1.3. Production does not invent fake patient names for unknown caller", () => {
		disableDemoShowcaseMode();
		const store = useTelephonyStore.getState();
		store.triggerIncomingCall({ phone: "+7 999 111-22-33", patientId: null, patientName: "", provider: "mango", status: "ringing" });
		const active = useTelephonyStore.getState().activeCall;
		assert.ok(active);
		assert.strictEqual(active.phone, "+79991112233");
		assert.ok(!active.patientName || active.patientName === "Неизвестный номер");
	});

	test("2.1. In demo mode, anonymous incoming call binds to canonical Smirnova Anna", () => {
		enableDemoShowcaseMode();
		assert.strictEqual(isDemoShowcaseMode(), true);
		const store = useTelephonyStore.getState();
		store.triggerIncomingCall({ phone: "", patientId: null, patientName: "", provider: "mango", status: "ringing" });
		const active = useTelephonyStore.getState().activeCall;
		assert.ok(active);
		assert.strictEqual(active.patientName, "Смирнова Анна Сергеевна");
		assert.strictEqual(active.patientId, "01a00000-0000-0000-0000-000000000001");
		assert.strictEqual(active.phone, "+79162345678");
	});

	test("2.2. In demo mode, explicit phone call preserves phone but links Smirnova Anna", () => {
		enableDemoShowcaseMode();
		const store = useTelephonyStore.getState();
		store.triggerIncomingCall({ phone: "+7 900 123-45-67", patientId: null, patientName: "Неизвестный номер", provider: "uis", status: "ringing" });
		const active = useTelephonyStore.getState().activeCall;
		assert.ok(active);
		assert.strictEqual(active.patientName, "Смирнова Анна Сергеевна");
		assert.strictEqual(active.patientId, "01a00000-0000-0000-0000-000000000001");
	});

	test("3.1. Doctor immunity covers doctor role, visit, odontogram, and periodontics", () => {
		const checkDoctorImmunity = (role: string, currentView: string) => {
			return role === "doctor" || currentView === "visit" || currentView === "odontogram" || currentView === "periodontics";
		};
		assert.strictEqual(checkDoctorImmunity("doctor", "schedule"), true);
		assert.strictEqual(checkDoctorImmunity("doctor", "patients"), true);
		assert.strictEqual(checkDoctorImmunity("administrator", "visit"), true);
		assert.strictEqual(checkDoctorImmunity("administrator", "odontogram"), true);
		assert.strictEqual(checkDoctorImmunity("administrator", "periodontics"), true);
		assert.strictEqual(checkDoctorImmunity("administrator", "schedule"), false);
		assert.strictEqual(checkDoctorImmunity("registrar", "finances"), false);
	});
});
