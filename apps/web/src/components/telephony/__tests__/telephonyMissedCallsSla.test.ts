import { beforeEach, describe, expect, it } from "vitest";
import {
	type CallHistoryItem,
	computeMissedCallsSlaSummary,
	isUnhandledMissedCall,
	useTelephonyStore,
} from "../../../store/telephonyStore";
import { resolveCallbackSlaStatus, resolveCallKind } from "../drawerModules/telephonyDrawerTypes";

describe("Telephony Missed Calls & 15m SLA Calculations", () => {
	beforeEach(() => {
		useTelephonyStore.setState({
			activeCall: null,
			callHistory: [],
			activeLineId: 1,
			isHeld: false,
			isCallDrawerOpen: false,
		});
	});

	it("1.1. Detects unhandled missed and rejected calls correctly", () => {
		const missed: CallHistoryItem = { id: "c1", phone: "+79161112233", patientId: null, patientName: "Новый", status: "missed" };
		expect(isUnhandledMissedCall(missed)).toBe(true);

		const cbCall: CallHistoryItem = { id: "c2", phone: "+79162223344", patientId: null, patientName: "Перезвон", status: "answered", outcome: "callback_15m" };
		expect(isUnhandledMissedCall(cbCall)).toBe(true);

		const answered: CallHistoryItem = { id: "c3", phone: "+79163334455", patientId: "p1", patientName: "Иванов", status: "answered", actionTaken: "accepted" };
		expect(isUnhandledMissedCall(answered)).toBe(false);
	});

	it("1.2. Computes SLA summary with within-SLA countdown and overdue detection", () => {
		const now = 1700000000000;
		const history: CallHistoryItem[] = [
			{ id: "fresh", phone: "+79161110001", patientId: null, patientName: "Свежий", status: "missed", callStartedAt: now - 5 * 60 * 1000 },
			{ id: "overdue", phone: "+79161110002", patientId: null, patientName: "Просроченный", status: "missed", callStartedAt: now - 20 * 60 * 1000 },
			{ id: "handled", phone: "+79161110003", patientId: "p3", patientName: "Обработанный", status: "missed", actionTaken: "accepted", callStartedAt: now - 30 * 60 * 1000 },
		];

		const summary = computeMissedCallsSlaSummary(history, now);
		expect(summary.totalUnhandledCount).toBe(2);
		expect(summary.overdueCount).toBe(1);
		expect(summary.withinSlaCount).toBe(1);
		expect(summary.nearestRemainingSeconds).toBe(10 * 60);

		const freshStatus = resolveCallbackSlaStatus(history[0]!, now);
		expect(freshStatus.status).toBe("pending_within_sla");
		expect(freshStatus.formattedCountdown).toBe("10:00");

		const overdueStatus = resolveCallbackSlaStatus(history[1]!, now);
		expect(overdueStatus.status).toBe("overdue_sla");
		expect(overdueStatus.formattedCountdown).toContain("Просрочен");
	});

	it("2.1. Resolves missed, outgoing, and incoming calls cleanly", () => {
		expect(resolveCallKind({ id: "1", phone: "+79991112233", patientId: null, patientName: "", status: "missed" })).toBe("missed");
		expect(resolveCallKind({ id: "2", phone: "+79991112233", patientId: null, patientName: "", status: "answered", direction: "outbound" })).toBe("outgoing");
		expect(resolveCallKind({ id: "3", phone: "+79991112233", patientId: null, patientName: "", status: "answered", direction: "inbound" })).toBe("incoming");
	});
});
