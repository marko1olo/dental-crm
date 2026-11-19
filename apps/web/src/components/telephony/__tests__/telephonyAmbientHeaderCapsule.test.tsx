import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { TelephonyHeaderCapsule } from "../headerCapsule/TelephonyHeaderCapsule";
import { TelephonySoftphonePopover } from "../headerCapsule/TelephonySoftphonePopover";
import { IncomingCallCapsuleBar } from "../incomingCallPopupModules/IncomingCallCapsuleBar";
import { IncomingCallerCardCompact } from "../incomingCallerCard/IncomingCallerCardCompact";
import { useTelephonyStore } from "../../../store/telephonyStore";

import { createMockIncomingCallController } from "./telephonyTestFixtures";

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
			id: "call-1", patientId: null, phone: "+7 (999) 000-11-22", patientName: "Иванов И.И.",
			status: "answered" as const, callStartedAt: Date.now() - 35000,
		};
		const html = renderToString(<TelephonyHeaderCapsule activeCall={mockCall} />);
		assert.ok(html.includes("border-emerald-500"), "Must show call highlight styling");
		assert.ok(html.includes("00:35") || html.includes("Иванов") || html.includes("animate-pulse"), "Must show active call duration or info");
		assert.ok(html.includes('data-testid="header-capsule-end-btn"'), "Must provide 1-click end call button when answered");
	});

	it("2b. TelephonyHeaderCapsule provides 1-click answer & reject buttons on incoming ringing call", () => {
		const ringingCall = {
			id: "call-ringing-1", patientId: null, phone: "+7 (999) 777-66-55", patientName: "Смирнова Е.В.",
			status: "ringing" as const,
		};
		const html = renderToString(<TelephonyHeaderCapsule activeCall={ringingCall} />);
		assert.ok(html.includes('data-testid="header-capsule-answer-btn"'), "Must provide 1-click answer button");
		assert.ok(html.includes('data-testid="header-capsule-reject-btn"'), "Must provide 1-click reject button");
		assert.ok(html.includes("Смирнова Е.В."), "Must display caller name in capsule");
	});

	it("3. TelephonySoftphonePopover provides line controls, dialpad, and recent calls", () => {
		useTelephonyStore.setState({ activeCall: null, agentState: "online", activeLineId: 1, callHistory: [] });
		const html = renderToString(<TelephonySoftphonePopover onClose={() => {}} isMobile={false} />);
		assert.ok(html.includes("АТС · Л1"), "Must display PBX connection info");
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
		const mockCtrl = createMockIncomingCallController({
			isCallAnswered: false, isCallEnded: false, elapsedSeconds: 8,
			callerName: "Смирнова Екатерина", formattedPhone: "+7 (926) 555-12-34",
			secondaryLine: { lineId: 2, state: "idle", call: null, durationSeconds: 0, isMuted: false },
			handleSwitchAndAnswerSecondaryLine: () => {},
			handleResumeSecondaryLine: () => {}, handleAnswerCall: () => {},
			handleReject: () => {}, handleEndCall: () => {}, dismissCall: () => {},
			closeCallDrawer: () => {}, setIsExpanded: () => {},
			lastVisitSummary: {
				lastVisitDate: "2026-10-14",
				formattedLastVisit: "14.10.2026",
				doctorName: "Д-р Петров",
				doctorSpecialty: "therapist",
				appointmentReason: "Кариес",
				isNewPatient: false,
			},
			isKnownPatient: true, handleToggleCardDrawer: () => {},
			handleQuickBook: () => {}, acutePainAlerts: [],
		});

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

	it("6. TelephonyHeaderCapsule suppresses duplicate answer/reject buttons when IncomingCallPopup is expanded on screen", () => {
		const ringingCall = {
			id: "call-ringing-1", patientId: null, phone: "+7 (999) 777-66-55", patientName: "Кузнецов Алексей Петрович",
			status: "ringing" as const,
		};
		const html = renderToString(<TelephonyHeaderCapsule activeCall={ringingCall} isPopupExpanded={true} />);
		assert.ok(!html.includes('data-testid="header-capsule-answer-btn"'), "Must not duplicate answer button when popup is expanded");
		assert.ok(!html.includes('data-testid="header-capsule-reject-btn"'), "Must not duplicate reject button when popup is expanded");
		assert.ok(html.includes("Кузнецов Алексей Петрович"), "Must display caller name without 130px clipping");
	});

	it("7. IncomingCallerCardCompact displays advance balance cleanly without double plus (DEF-01)", () => {
		const html = renderToString(
			<IncomingCallerCardCompact
				callerName="Иванова Ольга"
				formattedPhone="+7 (916) 123-45-67"
				initials="ИО"
				avatarColors={{ bg: "#0d9488", text: "#ffffff" }}
				isKnownPatient={true}
				resolvedCategory="Постоянный"
				hasDebt={false}
				hasDms={false}
				financialSummary={{
					balanceRub: 15000,
					formattedBalance: "+15 000 ₽",
					hasDebt: false,
					debtRub: 0,
					formattedDebt: "0 ₽",
					hasInsurance: false,
					insuranceName: null,
					policyNumber: null,
				}}
				somaticAlerts={[]}
				allergyAlerts={[]}
				acutePainAlerts={[]}
			/>
		);
		assert.ok(html.includes("Аванс:"), "Must render advance label");
		assert.ok(html.includes("+15") && html.includes("₽"), "Must render single plus with advance balance");
		assert.ok(!html.includes("++"), "Must strictly prevent double plus ++");
	});
});
