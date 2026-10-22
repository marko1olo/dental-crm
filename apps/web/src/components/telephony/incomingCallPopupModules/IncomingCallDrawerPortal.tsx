import React from "react";
import { IncomingCallPatientDrawer } from "../IncomingCallPatientDrawer";
import type { IncomingCallPopupController } from "./types";

export interface IncomingCallDrawerPortalProps {
	ctrl: IncomingCallPopupController;
}

export function IncomingCallDrawerPortal({
	ctrl,
}: IncomingCallDrawerPortalProps): React.JSX.Element | null {
	if (!ctrl.isCallDrawerOpen || !ctrl.currentCall) return null;

	return (
		<IncomingCallPatientDrawer
			isOpen={ctrl.isCallDrawerOpen}
			onClose={ctrl.closeCallDrawer}
			currentCall={ctrl.currentCall}
			callerName={ctrl.callerName}
			formattedPhone={ctrl.formattedPhone}
			initials={ctrl.initials}
			avatarColors={ctrl.avatarColors}
			isKnownPatient={ctrl.isKnownPatient}
			patientCategory={ctrl.patientCategory}
			resolvedPatient={ctrl.resolvedPatient}
			financialSummary={ctrl.financialSummary}
			somaticAlerts={ctrl.somaticAlerts}
			upcomingAppointment={ctrl.upcomingAppointment}
			lastVisitSummary={ctrl.lastVisitSummary}
			callAttribution={ctrl.callAttribution}
			isCapturingLead={ctrl.isCapturingLead}
			onCaptureLead={ctrl.handleCaptureLead}
			onSendWhatsApp={ctrl.handleSendWhatsAppConfirmation}
			onCopySms={ctrl.handleCopySmsConfirmation}
			smsCopied={ctrl.smsCopied}
			showQuickBooking={ctrl.showQuickBooking}
			onToggleQuickBooking={() => ctrl.setShowQuickBooking((prev) => !prev)}
			onQuickBook={ctrl.handleQuickBook}
			quickSlots={ctrl.quickSlots}
			onOpenFullPatientView={ctrl.handleOpenFullPatientView}
			isCallAnswered={ctrl.isCallAnswered}
			showTransferPanel={ctrl.showTransferPanel}
			onToggleTransferPanel={() => ctrl.setShowTransferPanel((prev) => !prev)}
			transferType={ctrl.transferType}
			onSelectTransferType={ctrl.setTransferType}
			onStartTransfer={(ext, type) => {
				ctrl.setTransferType(type);
				ctrl.handleSwitchAndAnswerSecondaryLine?.();
			}}
			showOutcomePanel={ctrl.showOutcomePanel}
			onToggleOutcomePanel={() => ctrl.setShowOutcomePanel((prev) => !prev)}
			onRecordOutcome={ctrl.handleRecordOutcome}
			newPatientNameInput={ctrl.newPatientNameInput}
			onChangeNewPatientNameInput={ctrl.setNewPatientNameInput}
			isCreatingPatient={ctrl.isCreatingPatient}
			onQuickCreatePatient={() => ctrl.handleQuickCreatePatient()}
		/>
	);
}
