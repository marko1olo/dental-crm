import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncomingCallCapsuleBar } from "../incomingCallPopupModules/IncomingCallCapsuleBar";
import { IncomingCallHeaderBar } from "../incomingCallPopupModules/IncomingCallHeaderBar";
import { IncomingCallActionFooter } from "../incomingCallPopupModules/IncomingCallActionFooter";
import type { IncomingCallPopupController } from "../incomingCallPopupModules/types";

const noop = () => {};
const noopAsync = async () => {};

function buildCtrl(overrides: Partial<IncomingCallPopupController> = {}): IncomingCallPopupController {
	const activeCall = {
		callId: "quiet-call-1",
		direction: "inbound" as const,
		phone: "+79005553535",
		patientName: "Анна Смирнова",
		status: "ringing" as const,
		callStartedAt: Date.now(),
	};
	return {
		activeCall,
		currentCall: activeCall,
		activeLineId: 1,
		secondaryLine: { lineId: 2, call: null, state: "idle", isHeld: false, startedAt: null },
		isMuted: false,
		isDndActive: false,
		isConnected: true,
		isDoctorMode: false,
		suppressCallModal: false,
		isFullScreenStudioActive: false,
		isCallDrawerOpen: false,
		isPopupExpanded: false,
		isCallAnswered: false,
		isCallEnded: false,
		smsCopied: false,
		newPatientNameInput: "",
		showTransferPanel: false,
		transferType: "blind",
		showBadgeMoreMenu: false,
		showQuickBooking: false,
		showOutcomePanel: false,
		isCreatingPatient: false,
		isCapturingLead: false,
		quickSlots: [],
		currentView: "schedule",
		selectedWorkspaceRole: "reception",
		elapsedSeconds: 3,
		formattedPhone: "+7 900 555-35-35",
		callerName: "Анна Смирнова",
		isKnownPatient: true,
		resolvedPatient: null,
		financialSummary: null,
		lastVisitSummary: null,
		upcomingAppointment: null,
		somaticAlerts: [],
		acutePainAlerts: [],
		activeTreatmentPlan: null,
		callAttribution: null,
		providerLabel: "Mango",
		initials: "АС",
		avatarColors: { bg: "", text: "" },
		setIsExpanded: noop,
		setNewPatientNameInput: noop,
		setShowTransferPanel: noop,
		setTransferType: noop,
		setShowBadgeMoreMenu: noop,
		setShowQuickBooking: noop,
		setShowOutcomePanel: noop,
		closeCallDrawer: noop,
		dismissCall: noop,
		toggleMute: noop,
		handleToggleCardDrawer: noop,
		handleOpenFullPatientView: noop,
		handleQuickBook: noop,
		handleQuickCreatePatient: noopAsync,
		handleCaptureLead: noopAsync,
		handleSendWhatsAppConfirmation: noop,
		handleCopySmsConfirmation: noop,
		handleAnswerCall: noop,
		handleReject: noop,
		handleEndCall: noop,
		handleSwitchAndAnswerSecondaryLine: noop,
		handleResumeSecondaryLine: noop,
		handleCopyPhone: noop,
		handleToggleDnd: noop,
		handleRecordOutcome: noop,
		handleStartQuickCreateFromMenu: noop,
		...overrides,
	};
}

describe("Telephony Quiet UI Dynamic Island & Header/Footer Render Contracts", () => {
	it("1. IncomingCallCapsuleBar renders compact dynamic-island capsule with backdrop-blur-xl and answer/card controls", () => {
		const html = renderToStaticMarkup(
			React.createElement(IncomingCallCapsuleBar, { ctrl: buildCtrl() }),
		);
		assert.ok(html.includes('data-testid="incoming-call-capsule"'));
		assert.ok(html.includes("backdrop-blur-xl"));
		assert.ok(html.includes('data-testid="capsule-answer-call-btn"'));
		assert.ok(html.includes('data-testid="capsule-open-card-btn"'));
	});

	it("2. IncomingCallCapsuleBar surfaces secondary ringing line switch pill when line 2 is ringing", () => {
		const html = renderToStaticMarkup(
			React.createElement(IncomingCallCapsuleBar, {
				ctrl: buildCtrl({
					secondaryLine: {
						lineId: 2,
						state: "ringing",
						isHeld: false,
						startedAt: Date.now(),
						call: {
							callId: "line2-call",
							direction: "inbound",
							phone: "+79009998877",
							status: "ringing",
							callStartedAt: Date.now(),
						},
					},
				}),
			}),
		);
		assert.ok(html.includes('data-testid="capsule-switch-secondary-line-btn"'));
		assert.ok(html.includes("Л2: Ответить"));
	});

	it("3. IncomingCallHeaderBar and IncomingCallActionFooter enforce clean header actions and single primary footer CTA", () => {
		const headerHtml = renderToStaticMarkup(
			React.createElement(IncomingCallHeaderBar, { ctrl: buildCtrl({ isPopupExpanded: true }) }),
		);
		assert.ok(headerHtml.includes('data-testid="badge-header-answer-btn"'));
		assert.ok(headerHtml.includes('data-testid="badge-collapse-btn"'));

		const footerHtml = renderToStaticMarkup(
			React.createElement(IncomingCallActionFooter, { ctrl: buildCtrl({ isPopupExpanded: true }) }),
		);
		assert.ok(footerHtml.includes('data-testid="incoming-call-action-footer"'));
		assert.equal((footerHtml.match(/primary-button/g) || []).length, 1);
	});
});
