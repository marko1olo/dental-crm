import { beforeEach, describe, expect, it } from "vitest";
import { useTelephonyStore } from "../../../store/telephonyStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
	resolveCallAdvertisingAttribution,
} from "../telephonyAttribution";

describe("Telephony Drawer Actions & Attribution Purity", () => {
	beforeEach(() => {
		useTelephonyStore.setState({
			activeCall: null,
			callHistory: [],
			activeLineId: 1,
			isHeld: false,
			isCallDrawerOpen: false,
		});
	});

	it("3.1. Opens and closes call drawer via facade actions", () => {
		const store = useTelephonyStore.getState();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);

		store.openCallDrawer();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(true);

		store.toggleCallDrawer();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);

		store.setIsCallDrawerOpen(true);
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(true);

		store.closeCallDrawer();
		expect(useTelephonyStore.getState().isCallDrawerOpen).toBe(false);
	});

	it("3.2. Record call outcome updates history and closes active call", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			callId: "call-outcome-test",
			phone: "+79165554433",
			patientId: null,
			patientName: "Лид на консультацию",
			status: "answered",
		});

		expect(useTelephonyStore.getState().activeCall).not.toBeNull();
		useTelephonyStore.getState().recordCallOutcome("consultation_booked", "Записан на субботу 14:00");

		expect(useTelephonyStore.getState().activeCall).toBeNull();
		const latest = useTelephonyStore.getState().callHistory[0];
		expect(latest?.outcome).toBe("consultation_booked");
		expect(latest?.outcomeNote).toBe("Записан на субботу 14:00");
	});

	it("4.1. Resolves channel attribution without color confetti or undefined", () => {
		const call = {
			phone: "+79990001122",
			patientId: null,
			patientName: "Неизвестный",
			utmSource: "yandex_direct",
			utmCampaign: "implants_2026",
			virtualNumber: "+74959998877",
		};

		const attr = resolveCallAdvertisingAttribution(call);
		expect(attr.channelKey).toBe("yandex_direct");
		expect(attr.channelLabel).toBe(CHANNEL_DISPLAY_NAMES.yandex_direct);
		expect(CHANNEL_BADGE_COLORS[attr.channelKey]).toBeDefined();
		expect(attr.notesPayload).toContain("implants_2026");
	});
});
