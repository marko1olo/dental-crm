import { beforeEach, describe, expect, it } from "vitest";
import {
	type CallHistoryItem,
	computeMissedCallsSlaSummary,
	isUnhandledMissedCall,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import {
	resolveCallbackSlaStatus,
	resolveCallKind,
} from "../drawerModules/telephonyDrawerTypes";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
	resolveCallAdvertisingAttribution,
} from "../telephonyAttribution";

describe("Telephony Drawer, Call Center Journal & 15m SLA Suite", () => {
	beforeEach(() => {
		useTelephonyStore.setState({
			activeCall: null,
			callHistory: [],
			activeLineId: 1,
			isHeld: false,
			isCallDrawerOpen: false,
		});
	});

	describe("1. Missed Calls 15-Minute SLA Calculations", () => {
		it("1.1. Detects unhandled missed and rejected calls correctly", () => {
			const missedCall: CallHistoryItem = {
				id: "call-missed-1",
				phone: "+79161112233",
				patientId: null,
				patientName: "Новый пациент",
				status: "missed",
			};
			expect(isUnhandledMissedCall(missedCall)).toBe(true);

			const callback15mCall: CallHistoryItem = {
				id: "call-cb-1",
				phone: "+79162223344",
				patientId: null,
				patientName: "Пациент с перезвоном",
				status: "answered",
				outcome: "callback_15m",
			};
			expect(isUnhandledMissedCall(callback15mCall)).toBe(true);

			const answeredCall: CallHistoryItem = {
				id: "call-ans-1",
				phone: "+79163334455",
				patientId: "pat-1",
				patientName: "Иванов И.И.",
				status: "answered",
				actionTaken: "accepted",
			};
			expect(isUnhandledMissedCall(answeredCall)).toBe(false);
		});

		it("1.2. Computes SLA summary with within-SLA countdown and overdue detection", () => {
			const now = 1700000000000;
			const history: CallHistoryItem[] = [
				{
					id: "fresh-missed",
					phone: "+79161110001",
					patientId: null,
					patientName: "Недавний пропущенный",
					status: "missed",
					callStartedAt: now - 5 * 60 * 1000, // 5 mins ago -> 10 mins remaining
				},
				{
					id: "overdue-missed",
					phone: "+79161110002",
					patientId: null,
					patientName: "Просроченный звонок",
					status: "missed",
					callStartedAt: now - 20 * 60 * 1000, // 20 mins ago -> overdue by 5 mins
				},
				{
					id: "handled-call",
					phone: "+79161110003",
					patientId: "pat-3",
					patientName: "Обработанный звонок",
					status: "missed",
					actionTaken: "accepted",
					callStartedAt: now - 30 * 60 * 1000,
				},
			];

			const summary = computeMissedCallsSlaSummary(history, now);
			expect(summary.totalUnhandledCount).toBe(2);
			expect(summary.overdueCount).toBe(1);
			expect(summary.withinSlaCount).toBe(1);
			expect(summary.nearestRemainingSeconds).toBe(10 * 60);

			// Individual SLA status check
			const freshStatus = resolveCallbackSlaStatus(history[0]!, now);
			expect(freshStatus.status).toBe("pending_within_sla");
			expect(freshStatus.formattedCountdown).toBe("10:00");

			const overdueStatus = resolveCallbackSlaStatus(history[1]!, now);
			expect(overdueStatus.status).toBe("overdue_sla");
			expect(overdueStatus.formattedCountdown).toContain("Просрочен");
		});
	});

	describe("2. Caller Kind and Direction Resolution", () => {
		it("2.1. Resolves missed, outgoing, and incoming calls cleanly", () => {
			expect(
				resolveCallKind({
					id: "1",
					phone: "+79991112233",
					patientId: null,
					patientName: "",
					status: "missed",
				}),
			).toBe("missed");

			expect(
				resolveCallKind({
					id: "2",
					phone: "+79991112233",
					patientId: null,
					patientName: "",
					status: "answered",
					direction: "outbound",
				}),
			).toBe("outgoing");

			expect(
				resolveCallKind({
					id: "3",
					phone: "+79991112233",
					patientId: null,
					patientName: "",
					status: "answered",
					direction: "inbound",
				}),
			).toBe("incoming");
		});
	});

	describe("3. Telephony Store Drawer Control & Concurrency", () => {
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
	});

	describe("4. Marketing Attribution Purity", () => {
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
});
