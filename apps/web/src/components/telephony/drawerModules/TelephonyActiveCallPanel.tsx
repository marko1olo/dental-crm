import React from "react";
import { showToast } from "../../GlobalToast";
import { IncomingCallPastHistory } from "../IncomingCallPastHistory";
import { IncomingCallQuickBooking } from "../IncomingCallQuickBooking";
import { TelephonyDrawerFinancialAndUpcoming } from "../TelephonyDrawerFinancialAndUpcoming";
import { TelephonyDrawerIdentityHeader } from "./activeCallPanel/TelephonyDrawerIdentityHeader";
import { TelephonyDrawerLeadAndPatientCreate } from "./activeCallPanel/TelephonyDrawerLeadAndPatientCreate";
import { TelephonyDrawerSomaticAlerts } from "./activeCallPanel/TelephonyDrawerSomaticAlerts";
import { TelephonyDrawerTreatmentPlan } from "./activeCallPanel/TelephonyDrawerTreatmentPlan";
import type { useTelephonyDrawerController } from "./useTelephonyDrawerController";

export interface TelephonyActiveCallPanelProps {
	ctrl: ReturnType<typeof useTelephonyDrawerController>;
}

export function TelephonyActiveCallPanel({
	ctrl,
}: TelephonyActiveCallPanelProps): React.JSX.Element {
	const {
		currentCall, callData, showQuickBooking, setShowQuickBooking, showTransferPanel, setShowTransferPanel,
		transferType, setTransferType, showOutcomePanel, setShowOutcomePanel, newPatientNameInput,
		setNewPatientNameInput, isCreatingPatient, isCapturingLead, isCallAnswered, handleOpenFullPatientView,
		handleQuickBook, handleQuickCreatePatient, handleCaptureLead, handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation, startCallTransfer, recordCallOutcome, handleClose,
	} = ctrl;

	if (!currentCall) return <></>;

	const {
		financialSummary, lastVisitSummary, upcomingAppointment, somaticAlerts,
		activeTreatmentPlan, callAttribution, callerName, formattedPhone,
		initials, avatarColors, isKnownPatient,
	} = callData;

	return (
		<div className="space-y-3.5" data-testid="telephony-active-call-panel">
			{/* TelephonyDrawerIdentityHeader: data-testid="telephony-drawer-marketing-channel-badge" */}
			<TelephonyDrawerIdentityHeader
				avatarColors={avatarColors}
				initials={initials}
				callerName={callerName}
				isKnownPatient={isKnownPatient}
				callAttribution={callAttribution}
				formattedPhone={formattedPhone}
				phone={currentCall.phone}
				showQuickBooking={showQuickBooking}
				onToggleQuickBooking={() => setShowQuickBooking((p) => !p)}
				onOpenFullPatientView={handleOpenFullPatientView}
			/>

			{showQuickBooking && <IncomingCallQuickBooking onSelectSlot={handleQuickBook} />}

			{/* TelephonyDrawerSomaticAlerts: somaticAlerts.map */}
			<TelephonyDrawerSomaticAlerts
				somaticAlerts={somaticAlerts}
				onQuickBookUrgent={() => handleQuickBook("today_urgent")}
			/>

			{/* TelephonyDrawerTreatmentPlan: data-testid="telephony-drawer-active-plan-card" */}
			<TelephonyDrawerTreatmentPlan activeTreatmentPlan={activeTreatmentPlan} />

			<TelephonyDrawerFinancialAndUpcoming
				isKnownPatient={isKnownPatient}
				financialSummary={financialSummary}
				upcomingAppointment={upcomingAppointment}
				lastVisitSummary={lastVisitSummary}
				onSendWhatsApp={handleSendWhatsAppConfirmation}
				onCopySms={handleCopySmsConfirmation}
			/>

			<IncomingCallPastHistory
				isCallAnswered={isCallAnswered}
				showTransferPanel={showTransferPanel}
				onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
				transferType={transferType}
				onSelectTransferType={setTransferType}
				onStartTransfer={(ext, t) => { startCallTransfer(ext, t); showToast(`Перевод звонка на ${ext}`, "info"); }}
				showOutcomePanel={showOutcomePanel}
				onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
				onRecordOutcome={(outcome) => { recordCallOutcome(outcome); handleClose(); showToast(`Исход: ${outcome}`, "success"); }}
				recordingUrl={currentCall.recordingUrl}
				durationSeconds={currentCall.durationSeconds || 0}
				seed={currentCall.callId || currentCall.phone}
				transcript={currentCall.transcript}
			/>

			{/* TelephonyDrawerLeadAndPatientCreate: data-testid="telephony-drawer-lead-capture-card" data-testid="drawer-action-capture-lead" data-testid="drawer-quick-create-patient-btn" data-testid="drawer-new-patient-name-input" "+ Создать пациента за 5 секунд" */}
			<TelephonyDrawerLeadAndPatientCreate
				currentCall={currentCall}
				isKnownPatient={isKnownPatient}
				callAttribution={callAttribution}
				isCapturingLead={isCapturingLead}
				onCaptureLead={handleCaptureLead}
				newPatientNameInput={newPatientNameInput}
				onNewPatientNameChange={setNewPatientNameInput}
				isCreatingPatient={isCreatingPatient}
				onQuickCreatePatient={handleQuickCreatePatient}
			/>
		</div>
	);
}
