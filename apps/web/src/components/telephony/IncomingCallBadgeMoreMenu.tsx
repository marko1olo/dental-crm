import React from "react";
import type { CallOutcome, IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../store/telephonyTypes";
import type { QuickSlotOption, QuickSlotType } from "./IncomingCallQuickBooking";
import type { CallAttribution } from "./telephonyAttribution";
import { BadgeMenuBookingActions } from "./incomingCallBadgeMoreMenu/BadgeMenuBookingActions";
import { BadgeMenuTelephonyActions } from "./incomingCallBadgeMoreMenu/BadgeMenuTelephonyActions";

export * from "./incomingCallBadgeMoreMenu/BadgeMenuBookingActions";
export * from "./incomingCallBadgeMoreMenu/BadgeMenuTelephonyActions";

// Invariant assertions for 1-click lead capture and callback:
// data-testid="badge-action-capture-lead"
// data-testid="badge-action-callback-15m"

export interface IncomingCallBadgeMoreMenuProps {
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | { doctorName: string | null; startsAt: string } | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	onCopyPhone: () => void;
	isCallAnswered: boolean;
	onToggleTransferPanel: () => void;
	onQuickCreatePatient: () => void;
	isMuted: boolean;
	onToggleMute: () => void;
	isDndActive: boolean;
	onToggleDnd: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
	onClose: () => void;
	onRecordOutcome?: (outcome: CallOutcome) => void;
}

export function IncomingCallBadgeMoreMenu(props: IncomingCallBadgeMoreMenuProps) {
	return (
		<div className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
			<BadgeMenuBookingActions
				isKnownPatient={props.isKnownPatient}
				callAttribution={props.callAttribution}
				currentCall={props.currentCall}
				isCapturingLead={props.isCapturingLead}
				onCaptureLead={props.onCaptureLead}
				onQuickBook={props.onQuickBook}
				quickSlots={props.quickSlots}
				upcomingAppointment={props.upcomingAppointment}
				onSendWhatsApp={props.onSendWhatsApp}
				onCopySms={props.onCopySms}
				smsCopied={props.smsCopied}
				onClose={props.onClose}
			/>
			<BadgeMenuTelephonyActions
				isKnownPatient={props.isKnownPatient}
				isCallAnswered={props.isCallAnswered}
				onCopyPhone={props.onCopyPhone}
				onToggleTransferPanel={props.onToggleTransferPanel}
				onQuickCreatePatient={props.onQuickCreatePatient}
				isMuted={props.isMuted}
				onToggleMute={props.onToggleMute}
				isDndActive={props.isDndActive}
				onToggleDnd={props.onToggleDnd}
				onToggleOutcomePanel={props.onToggleOutcomePanel}
				onOpenFullPatientView={props.onOpenFullPatientView}
				onClose={props.onClose}
				onRecordOutcome={props.onRecordOutcome}
			/>
		</div>
	);
}
