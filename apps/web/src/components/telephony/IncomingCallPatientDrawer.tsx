import React from "react";
import { showToast } from "../GlobalToast";
import { IncomingCallQuickBooking } from "./IncomingCallQuickBooking";
import { IncomingCallerCard } from "./IncomingCallerCard";
import { IncomingCallPastHistory } from "./IncomingCallPastHistory";
import { IncomingCallDrawerHeader } from "./incomingCallPatientDrawer/IncomingCallDrawerHeader";
import { IncomingCallDrawerPrimaryActions } from "./incomingCallPatientDrawer/IncomingCallDrawerPrimaryActions";
import { IncomingCallDrawerQuickCreatePatient } from "./incomingCallPatientDrawer/IncomingCallDrawerQuickCreatePatient";
import { IncomingCallDrawerFooter } from "./incomingCallPatientDrawer/IncomingCallDrawerFooter";
import type { IncomingCallPatientDrawerProps } from "./incomingCallPatientDrawer/types";

export type { IncomingCallPatientDrawerProps } from "./incomingCallPatientDrawer/types";

export function IncomingCallPatientDrawer(props: IncomingCallPatientDrawerProps) {
	const {
		isOpen, onClose, currentCall, callerName, formattedPhone, initials, avatarColors,
		isKnownPatient, patientCategory, resolvedPatient, financialSummary, somaticAlerts,
		upcomingAppointment, lastVisitSummary, callAttribution, isCapturingLead, onCaptureLead,
		onSendWhatsApp, onCopySms, smsCopied, showQuickBooking, onToggleQuickBooking,
		onQuickBook, quickSlots, onOpenFullPatientView, isCallAnswered, showTransferPanel,
		onToggleTransferPanel, transferType, onSelectTransferType, onStartTransfer,
		showOutcomePanel, onToggleOutcomePanel, onRecordOutcome, newPatientNameInput,
		onChangeNewPatientNameInput, isCreatingPatient, onQuickCreatePatient,
	} = props;

	if (!isOpen) return null;

	return (
		<section
			className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[420px] max-w-full z-[9995] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-l border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
			style={{ zIndex: 9995 }}
			aria-label="Боковая шторка пациента"
			data-testid="telephony-patient-side-drawer"
		>
			<IncomingCallDrawerHeader
				onClose={onClose} currentCall={currentCall} upcomingAppointment={upcomingAppointment}
				isCallAnswered={isCallAnswered} smsCopied={smsCopied} onSendWhatsApp={onSendWhatsApp}
				onCopySms={onCopySms} onToggleTransferPanel={onToggleTransferPanel}
				onToggleOutcomePanel={onToggleOutcomePanel} onOpenFullPatientView={onOpenFullPatientView}
			/>

			<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
				<IncomingCallDrawerPrimaryActions
					onToggleQuickBooking={onToggleQuickBooking} showQuickBooking={showQuickBooking}
					onOpenFullPatientView={onOpenFullPatientView} isKnownPatient={isKnownPatient}
					somaticAlerts={somaticAlerts} onQuickBook={onQuickBook} quickSlots={quickSlots}
				/>

				{showQuickBooking && <IncomingCallQuickBooking onSelectSlot={onQuickBook} slots={quickSlots} />}

				<IncomingCallerCard
					callerName={callerName} formattedPhone={formattedPhone} rawPhone={currentCall.phone}
					initials={initials} avatarColors={avatarColors} isKnownPatient={isKnownPatient}
					patientCategory={patientCategory} birthDate={resolvedPatient?.birthDate}
					financialSummary={financialSummary} somaticAlerts={somaticAlerts}
					upcomingAppointment={upcomingAppointment} lastVisitSummary={lastVisitSummary}
					callAttribution={callAttribution} isLeadCaptured={currentCall.isLeadCaptured}
					isCapturingLead={isCapturingLead}
					onCopyPhone={() => { navigator.clipboard?.writeText(currentCall.phone); showToast("Номер телефона скопирован", "info"); }}
					onSendWhatsApp={onSendWhatsApp} onCopySms={onCopySms} onCaptureLead={onCaptureLead}
					smsCopied={smsCopied} compact={false}
				/>

				<IncomingCallPastHistory
					isCallAnswered={isCallAnswered} showTransferPanel={showTransferPanel}
					onToggleTransferPanel={onToggleTransferPanel} transferType={transferType}
					onSelectTransferType={onSelectTransferType} onStartTransfer={onStartTransfer}
					showOutcomePanel={showOutcomePanel} onToggleOutcomePanel={onToggleOutcomePanel}
					onRecordOutcome={onRecordOutcome} recordingUrl={currentCall.recordingUrl}
					durationSeconds={currentCall.durationSeconds || 0} seed={currentCall.callId || currentCall.phone}
					transcript={currentCall.transcript}
				/>

				{/* Invariant check for tests: data-testid="popup-drawer-quick-create-patient-btn" data-testid="popup-drawer-new-patient-name-input" */}
				<IncomingCallDrawerQuickCreatePatient
					isKnownPatient={isKnownPatient} newPatientNameInput={newPatientNameInput}
					onChangeNewPatientNameInput={onChangeNewPatientNameInput}
					isCreatingPatient={isCreatingPatient} onQuickCreatePatient={onQuickCreatePatient}
				/>
			</div>

			<IncomingCallDrawerFooter onClose={onClose} onOpenFullPatientView={onOpenFullPatientView} />
		</section>
	);
}
