import assert from "node:assert/strict";
import test from "node:test";
import { useTelephonyStore } from "../../store/telephonyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useThemeStore } from "../../store/themeStore";

test("ClinicControlPill & Control Center - Telephony and PBX state synchronization", () => {
	const store = useTelephonyStore.getState();

	// 1. Initial agent state
	assert.ok(["online", "dnd", "pause", "offline"].includes(store.agentState));

	// 2. Set agent state to DND
	store.setAgentState("dnd");
	assert.strictEqual(useTelephonyStore.getState().agentState, "dnd");

	// 3. Switch lines
	store.switchLine(2);
	assert.strictEqual(useTelephonyStore.getState().activeLineId, 2);

	store.switchLine(1);
	assert.strictEqual(useTelephonyStore.getState().activeLineId, 1);

	// 4. Mute toggle
	const initialMuted = store.isMuted;
	store.toggleMute();
	assert.strictEqual(useTelephonyStore.getState().isMuted, !initialMuted);
	store.toggleMute();
	assert.strictEqual(useTelephonyStore.getState().isMuted, initialMuted);
});

test("ClinicControlPill & Dynamic Island - Active call triggering and state lifecycle", () => {
	const store = useTelephonyStore.getState();

	// 1. Trigger incoming call
	store.triggerIncomingCall({
		phone: "+79998887766",
		patientId: "pat-test-1",
		patientName: "Смирнова Елена Васильевна",
		provider: "mango",
		timestamp: new Date().toISOString(),
		status: "ringing",
		callStartedAt: Date.now(),
		recordingUrl: "https://records.mango-office.ru/sample-rec.mp3",
	});

	const activeCall = useTelephonyStore.getState().activeCall;
	assert.ok(activeCall);
	assert.strictEqual(activeCall?.patientName, "Смирнова Елена Васильевна");
	assert.strictEqual(activeCall?.status, "ringing");

	// 2. Answer call (WebRTC)
	store.answerCall();
	assert.strictEqual(useTelephonyStore.getState().activeCall?.status, "answered");

	// 3. Call transfer
	store.startCallTransfer("102", "blind");
	assert.strictEqual(useTelephonyStore.getState().transferState?.targetExtension, "102");
	assert.strictEqual(useTelephonyStore.getState().transferState?.transferType, "blind");

	// 4. Reject / Dismiss call
	store.rejectCall();
	assert.strictEqual(useTelephonyStore.getState().activeCall, null);
});

test("ClinicControlPill - Theme toggle and workspace safety", () => {
	const themeStore = useThemeStore.getState();
	const prevTheme = themeStore.themeMode;

	themeStore.setThemeMode("dark");
	assert.strictEqual(useThemeStore.getState().themeMode, "dark");

	themeStore.setThemeMode("light");
	assert.strictEqual(useThemeStore.getState().themeMode, "light");

	// Restore previous
	themeStore.setThemeMode(prevTheme);
});
