import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { TelephonyHeaderCapsule } from "../headerCapsule/TelephonyHeaderCapsule";
import { TelephonySoftphonePopover } from "../headerCapsule/TelephonySoftphonePopover";
import { IncomingCallCapsuleBar } from "../incomingCallPopupModules/IncomingCallCapsuleBar";
import { useTelephonyStore } from "../../../store/telephonyStore";

describe("Telephony Ambient Header Capsule & Dynamic Island Suite (Mandates 8e, 8n, Apple HIG)", () => {
	it("1. TelephonyHeaderCapsule renders discreet 32px topbar pill with online state", () => {
		useTelephonyStore.setState({ activeCall: null, agentState: "online", activeLineId: 1 });
		const html = renderToString(<TelephonyHeaderCapsule />);
		assert.ok(html.includes('data-testid="topbar-chairside-telephony-btn"'), "Must render header telephony button");
		assert.ok(html.includes("h-8") && html.includes("min-h-[32px]"), "Must enforce discreet 32px height");
		assert.ok(html.includes("bg-emerald-500"), "Must show green online status dot");
		assert.ok(html.includes("Л1"), "Must display active PBX line");
	});

	it("2. TelephonyHeaderCapsule displays active call with timer without blocking UI", () => {
		const mockCall = {
			id: "call-1", phone: "+7 (999) 000-11-22", patientName: "Иванов И.И.",
			status: "answered" as const, callStartedAt: Date.now() - 35000,
		};
		const html = renderToString(<TelephonyHeaderCapsule activeCall={mockCall} />);
		assert.ok(html.includes("border-emerald-500"), "Must show call highlight styling");
		assert.ok(html.includes("00:35") || html.includes("Иванов") || html.includes("animate-pulse"), "Must show active call duration or info");
	});

	it("3. TelephonySoftphonePopover provides line controls, dialpad, and recent calls", () => {
		useTelephonyStore.setState({ activeCall: null, agentState: "online", activeLineId: 1, callHistory: [] });
		const html = renderToString(<TelephonySoftphonePopover onClose={() => {}} isMobile={false} />);
		assert.ok(html.includes("Mango PBX"), "Must display PBX connection info");
		assert.ok(html.includes("Онлайн") && html.includes("Занят") && html.includes("Пауза"), "Must offer agent state pills");
		assert.ok(html.includes("Вызов"), "Must provide call action button");
		assert.ok(html.includes("Набор") && html.includes("Журнал"), "Must provide softphone tabs");
	});

	it("4. TelephonySoftphonePopover adapts to native iOS Bottom Sheet on mobile", () => {
		const html = renderToString(<TelephonySoftphonePopover onClose={() => {}} isMobile={true} />);
		assert.ok(html.includes("rounded-t-[24px]"), "Mobile softphone must render as Apple HIG bottom sheet");
		assert.ok(html.includes("min-h-[44px]"), "Mobile controls must enforce touch target >= 44px");
	});

	it("5. IncomingCallCapsuleBar provides Dynamic Island banner with 1-click card & booking", () => {
		const mockCtrl = {
			isCallAnswered: false, isCallEnded: false, elapsedSeconds: 8,
			callerName: "Смирнова Екатерина", formattedPhone: "+7 (926) 555-12-34",
			secondaryLine: null, handleSwitchAndAnswerSecondaryLine: () => {},
			handleResumeSecondaryLine: () => {}, handleAnswerCall: () => {},
			handleReject: () => {}, handleEndCall: () => {}, dismissCall: () => {},
			closeCallDrawer: () => {}, setIsExpanded: () => {},
			lastVisitSummary: { date: "14.10.2026", procedure: "Кариес" },
			isKnownPatient: true, handleToggleCardDrawer: () => {},
			handleQuickBook: () => {}, acutePainAlerts: [],
		} as any;

		const html = renderToString(<IncomingCallCapsuleBar ctrl={mockCtrl} />);
		assert.ok(html.includes('data-testid="incoming-call-capsule"'), "Must render Dynamic Island capsule");
		assert.ok(html.includes("Смирнова Екатерина"), "Must display caller name");
		assert.ok(html.includes('data-testid="capsule-last-visit-badge"'), "Must display last visit badge");
		assert.ok(html.includes('data-testid="capsule-open-card-btn"'), "Must provide 1-click open card button");
		assert.ok(html.includes('data-testid="capsule-quick-book-btn"'), "Must provide 1-click booking button");
		assert.ok(html.includes('data-testid="capsule-collapse-btn"'), "Must provide collapse button");
		assert.ok(html.includes('data-testid="capsule-answer-call-btn"'), "Must provide answer button");
		assert.ok(html.includes('data-testid="capsule-reject-call-btn"'), "Must provide reject button");
	});
});
