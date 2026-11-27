import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncomingCallActionFooter } from "../incomingCallPopupModules/IncomingCallActionFooter";
import type { IncomingCallPopupController } from "../incomingCallPopupModules/types";
import { TelephonyDrawerMoreMenu } from "../drawerModules/TelephonyDrawerMoreMenu";
import { TelephonyStudioModal } from "../TelephonyStudioModal";
import { enableDemoShowcaseMode, disableDemoShowcaseMode } from "../../../lib/demoMode";

const noop = () => {};
const noopAsync = async () => {};

function createTestPopupCtrl(overrides: Partial<IncomingCallPopupController> = {}): IncomingCallPopupController {
	const baseCall = {
		callId: "call-1",
		direction: "inbound" as const,
		phone: "+79001112233",
		patientName: "Неизвестный номер",
		status: "ringing" as const,
		callStartedAt: Date.now(),
	};
	return {
		activeCall: baseCall,
		currentCall: baseCall,
		activeLineId: 1,
		secondaryLine: { lineId: 2, call: null, state: "idle", isHeld: false, startedAt: null },
		isMuted: false,
		isDndActive: false,
		isConnected: true,
		isDoctorMode: false,
		suppressCallModal: false,
		isFullScreenStudioActive: false,
		isCallDrawerOpen: false,
		isPopupExpanded: true,
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
		elapsedSeconds: 5,
		formattedPhone: "+7 900 111-22-33",
		callerName: "Неизвестный номер",
		isKnownPatient: false,
		resolvedPatient: null,
		financialSummary: null,
		lastVisitSummary: null,
		upcomingAppointment: null,
		somaticAlerts: [],
		acutePainAlerts: [],
		activeTreatmentPlan: null,
		callAttribution: {
			channelKey: "yandex_direct",
			channelLabel: "Яндекс.Директ",
			virtualNumberDisplay: "+7 495 100-00-01",
			providerLabel: "Mango",
			utmSummary: "yandex / cpc",
			notesPayload: "",
		},
		providerLabel: "SIP АТС",
		initials: "НН",
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

describe("Telephony Miller Buttons, Single Primary CTA & Design Tokens (Mandate 8am)", () => {
	it("1. IncomingCallActionFooter renders single primary-button CTA and neutral secondary controls", () => {
		const html = renderToStaticMarkup(
			React.createElement(IncomingCallActionFooter, { ctrl: createTestPopupCtrl() }),
		);
		assert.ok(html.includes('data-testid="badge-action-book"'), "Primary booking button must exist");
		assert.ok(html.includes('data-testid="badge-action-callback"'), "Callback button must exist");
		assert.ok(html.includes('data-testid="badge-action-card"'), "Card button must exist");
		assert.ok(html.includes('data-testid="badge-more-menu-btn"'), "More menu trigger must exist");
		const primaryCount = (html.match(/primary-button/g) || []).length;
		assert.equal(primaryCount, 1, "Footer must contain strictly 1 primary CTA");
		assert.equal(html.includes("bg-white"), false, "No raw bg-white classes in popup footer");
	});

	it("2. TelephonyDrawerMoreMenu renders lead capture action and uses semantic CSS variables", () => {
		const html = renderToStaticMarkup(
			React.createElement(TelephonyDrawerMoreMenu, {
				isKnownPatient: false,
				callAttribution: {
					channelKey: "yandex_direct",
					channelLabel: "Яндекс.Директ",
					virtualNumberDisplay: "+7 495 100-00-01",
					providerLabel: "Mango",
					utmSummary: "yandex / cpc",
					notesPayload: "",
				},
				currentCall: createTestPopupCtrl().currentCall,
				isCapturingLead: false,
				onCaptureLead: noop,
				upcomingAppointment: null,
				onSendWhatsApp: noop,
				onCopySms: noop,
				smsCopied: false,
				isCallAnswered: false,
				onToggleTransferPanel: noop,
				onToggleOutcomePanel: noop,
				onOpenFullPatientView: noop,
				onClose: noop,
			}),
		);
		assert.ok(html.includes('data-testid="drawer-more-action-capture-lead"'));
		assert.ok(html.includes("var(--paper-strong)"));
		assert.equal(html.includes("bg-white"), false);
	});

	it("3. TelephonyStudioModal renders semantic surface tokens without hardcoded bg-white or disabled locks", () => {
		enableDemoShowcaseMode();
		try {
			const html = renderToStaticMarkup(
				React.createElement(TelephonyStudioModal, { isOpen: true, onClose: noop }),
			);
			assert.ok(html.includes('data-testid="telephony-studio-close-btn"'));
			assert.equal(html.includes("bg-white"), false, "TelephonyStudioModal must use theme tokens, not bg-white");
			assert.equal(/<button[^>]*disabled/i.test(html), false, "TelephonyStudioModal must keep buttons unlocked");
		} finally {
			disableDemoShowcaseMode();
		}
	});
});
