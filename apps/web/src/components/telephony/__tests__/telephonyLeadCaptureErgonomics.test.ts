import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
	type CallAttribution,
} from "../telephonyAttribution";
import { IncomingCallerCard } from "../IncomingCallerCard";
import { IncomingCallActionFooter } from "../incomingCallPopupModules/IncomingCallActionFooter";
import type { IncomingCallPopupController } from "../incomingCallPopupModules/types";
import { TelephonyDrawerIdentityHeader } from "../drawerModules/activeCallPanel/TelephonyDrawerIdentityHeader";
import { TelephonyDrawerLeadAndPatientCreate } from "../drawerModules/activeCallPanel/TelephonyDrawerLeadAndPatientCreate";
import { TelephonyDrawerMoreMenu } from "../drawerModules/TelephonyDrawerMoreMenu";

const SAMPLE_ATTR: CallAttribution = {
	channelKey: "yandex_direct",
	channelLabel: "Яндекс.Директ",
	virtualNumberDisplay: "+7 495 100-00-01",
	providerLabel: "Mango",
	utmSummary: "yandex / cpc",
	notesPayload: "",
};

const SAMPLE_CALL = {
	callId: "lead-call-1",
	direction: "inbound" as const,
	phone: "+79001112233",
	patientName: "Новый номер",
	status: "ringing" as const,
	callStartedAt: Date.now(),
};

const noop = () => {};
const noopAsync = async () => {};

function createCtrlForLeadMenu(): IncomingCallPopupController {
	return {
		activeCall: SAMPLE_CALL,
		currentCall: SAMPLE_CALL,
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
		showBadgeMoreMenu: true,
		showQuickBooking: false,
		showOutcomePanel: false,
		isCreatingPatient: false,
		isCapturingLead: false,
		quickSlots: [],
		currentView: "schedule",
		selectedWorkspaceRole: "reception",
		elapsedSeconds: 2,
		formattedPhone: "+7 900 111-22-33",
		callerName: "Новый номер",
		isKnownPatient: false,
		resolvedPatient: null,
		financialSummary: null,
		lastVisitSummary: null,
		upcomingAppointment: null,
		somaticAlerts: [],
		acutePainAlerts: [],
		activeTreatmentPlan: null,
		callAttribution: SAMPLE_ATTR,
		providerLabel: "Mango",
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
	};
}

describe("Telephony Lead Capture Visual & Ergonomics Integrity (Miller's Law & Tokens)", () => {
	it("3.1. IncomingCallerCard & IncomingCallActionFooter expose marketing attribution badge and lead capture CTA", () => {
		const compactCardHtml = renderToStaticMarkup(
			React.createElement(IncomingCallerCard, {
				callerName: "Новый номер",
				formattedPhone: "+7 900 111-22-33",
				rawPhone: "+79001112233",
				initials: "НН",
				avatarColors: { bg: "", text: "" },
				isKnownPatient: false,
				financialSummary: {
					hasDebt: false,
					debtAmountRub: 0,
					depositBalanceRub: 0,
					hasInsurance: false,
					formattedDebt: "0 ₽",
					formattedDeposit: "0 ₽",
				},
				somaticAlerts: [],
				upcomingAppointment: null,
				callAttribution: SAMPLE_ATTR,
				onCaptureLead: noop,
				compact: true,
			}),
		);
		assert.ok(compactCardHtml.includes('data-testid="incoming-call-marketing-channel-badge"'));

		const fullCardHtml = renderToStaticMarkup(
			React.createElement(IncomingCallerCard, {
				callerName: "Новый номер",
				formattedPhone: "+7 900 111-22-33",
				rawPhone: "+79001112233",
				initials: "НН",
				avatarColors: { bg: "", text: "" },
				isKnownPatient: false,
				financialSummary: {
					hasDebt: false,
					debtAmountRub: 0,
					depositBalanceRub: 0,
					hasInsurance: false,
					formattedDebt: "0 ₽",
					formattedDeposit: "0 ₽",
				},
				somaticAlerts: [],
				upcomingAppointment: null,
				callAttribution: SAMPLE_ATTR,
				onCaptureLead: noop,
				compact: false,
			}),
		);
		assert.ok(fullCardHtml.includes('data-testid="drawer-action-capture-lead"'));

		const footerHtml = renderToStaticMarkup(
			React.createElement(IncomingCallActionFooter, { ctrl: createCtrlForLeadMenu() }),
		);
		assert.ok(footerHtml.includes('data-testid="badge-action-capture-lead"'));
	});

	it("3.2. TelephonyDrawer identity header & lead capture card render attribution and 1-click capture CTA", () => {
		const headerHtml = renderToStaticMarkup(
			React.createElement(TelephonyDrawerIdentityHeader, {
				avatarColors: { bg: "", text: "" },
				initials: "НН",
				callerName: "Новый номер",
				isKnownPatient: false,
				callAttribution: SAMPLE_ATTR,
				formattedPhone: "+7 900 111-22-33",
				phone: "+79001112233",
				showQuickBooking: false,
				onToggleQuickBooking: noop,
				onOpenFullPatientView: noop,
			}),
		);
		assert.ok(headerHtml.includes('data-testid="telephony-drawer-marketing-channel-badge"'));

		const captureHtml = renderToStaticMarkup(
			React.createElement(TelephonyDrawerLeadAndPatientCreate, {
				currentCall: SAMPLE_CALL,
				isKnownPatient: false,
				callAttribution: SAMPLE_ATTR,
				isCapturingLead: false,
				onCaptureLead: noop,
				newPatientNameInput: "",
				onNewPatientNameChange: noop,
				isCreatingPatient: false,
				onQuickCreatePatient: noop,
			}),
		);
		assert.ok(captureHtml.includes('data-testid="telephony-drawer-lead-capture-card"'));
		assert.ok(captureHtml.includes('data-testid="drawer-action-capture-lead"'));
	});

	it("3.3. TelephonyDrawerMoreMenu exposes lead capture action for unknown caller", () => {
		const moreHtml = renderToStaticMarkup(
			React.createElement(TelephonyDrawerMoreMenu, {
				isKnownPatient: false,
				callAttribution: SAMPLE_ATTR,
				currentCall: SAMPLE_CALL,
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
		assert.ok(moreHtml.includes('data-testid="drawer-more-action-capture-lead"'));
	});

	it("3.4. All 8 canonical marketing channels have defined display names and tokens", () => {
		const expectedKeys = [
			"yandex_direct",
			"gis_2",
			"prodoctorov",
			"napopravku",
			"site_seo",
			"social_media",
			"recommendations",
			"other",
		] as const;

		for (const key of expectedKeys) {
			assert.ok(CHANNEL_DISPLAY_NAMES[key], `Missing display name for ${key}`);
			assert.ok(CHANNEL_BADGE_COLORS[key], `Missing badge colors for ${key}`);
		}
	});
});
