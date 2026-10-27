import React, { useRef } from "react";
import { showToast } from "../GlobalToast";
import { TelephonyWidgetHeader } from "./TelephonyWidgetHeader";
import { TelephonyActiveCallHud } from "./telephonyFloatingWidget/TelephonyActiveCallHud";
import { TelephonyDialpad } from "./telephonyFloatingWidget/TelephonyDialpad";
import { TelephonyIncomingCallCard } from "./telephonyFloatingWidget/TelephonyIncomingCallCard";
import { TelephonyRecentCallsList } from "./telephonyFloatingWidget/TelephonyRecentCallsList";
import { useTelephonyFloatingState } from "./telephonyFloatingWidget/useTelephonyFloatingState";
import type { TelephonyFloatingWidgetProps } from "./telephonyFloatingWidget/types";
import "./telephonyFloatingWidget.css";

export * from "./telephonyFloatingWidget/index";
export * from "./TelephonyDialerPad";
export * from "./TelephonyRecentCallsJournal";
export * from "./TelephonyMiniControlPanel";
export * from "./TelephonyWidgetMoreMenu";
export * from "./TelephonyWidgetHeader";
export type { TelephonyFloatingWidgetProps };

export function TelephonyFloatingWidget(props: TelephonyFloatingWidgetProps) {
	const dialInputRef = useRef<HTMLInputElement | null>(null);
	const s = useTelephonyFloatingState(props);
	// Non-blocking call ergonomics (Mandate 8e): dialInputRef.current?.focus();
	// showToast("Введите номер телефона для набора", "warning");
	const isDoctorChairsideMode = s.isDoctorChairsideMode;
	if (isDoctorChairsideMode) {
		return null;
	}
	// Zero Floating Blobs Mandate: Telephony is fully unified into Ambient Header Capsule.
	// Floating widget suppresses any rogue blobs unless explicitly mounted with defaultExpanded.
	if (!props.defaultExpanded || s.isFullScreenStudioActive || s.hasPrimaryModal) {
		return null;
	}

	return (
		<div className={`dnt-telephony-island-container ${props.className || ""}`} data-testid="telephony-floating-widget">
			<div className="dnt-telephony-island-expanded" role="dialog" aria-label="Детализированный центр вызова (Dynamic Island Studio)">
				<TelephonyWidgetHeader
					activeCall={s.activeCall} isCallAnswered={s.isCallAnswered} elapsedSeconds={s.elapsedSeconds}
					agentState={s.agentState} onSetAgentState={s.setAgentState} activeLineId={s.activeLineId}
					onSwitchLine={s.switchLine} line1={s.line1} line2={s.line2} isHeld={s.isHeld} onToggleHold={s.toggleHold}
					isMuted={s.isMuted} onToggleMute={s.toggleMute} onAnswerCall={() => { s.answerCall(); showToast("Вызов принят", "success"); }}
					onRejectCall={() => { s.rejectCall(); showToast("Вызов завершен", "info"); }}
					onCollapse={() => { s.setIsOpen(false); s.setIsExpanded(false); }}
					onClose={() => { if (s.activeCall) s.dismissCall(); s.setIsOpen(false); s.setIsExpanded(false); }}
					activeTab={s.activeTab} onSelectTab={s.setActiveTab} callHistoryCount={s.callHistory.length} isWsConnected={s.isWsConnected}
				/>
				<div className="dnt-widget-body">
					{s.activeTab === "call" && (
						<>
							{s.activeCall && (
								<TelephonyActiveCallHud
									activeCall={s.activeCall} isCallAnswered={s.isCallAnswered} elapsedSeconds={s.elapsedSeconds}
									isHeld={s.isHeld} onToggleHold={s.toggleHold} isMuted={s.isMuted} onToggleMute={s.toggleMute}
									showTransferPanel={s.showTransferPanel} onToggleTransferPanel={() => s.setShowTransferPanel((p) => !p)}
									transferType={s.transferType} onSetTransferType={s.setTransferType}
									onStartTransfer={(ext, type) => { s.startCallTransfer(ext, type); showToast(`Перевод звонка на ${ext} (${type === "blind" ? "Прямой" : "С консультацией"})`, "info"); }}
									onEndCall={() => { s.rejectCall(); showToast("Вызов завершен", "info"); }}
									activeLineId={s.activeLineId} onSwitchLine={s.switchLine} line1={s.line1} line2={s.line2}
								/>
							)}
							<TelephonyIncomingCallCard
								activeCall={s.activeCall} resolvedPatient={s.resolvedPatient} financialSummary={s.financialSummary}
								lastVisitSummary={s.lastVisitSummary} callerName={s.callerName} formattedPhone={s.formattedPhone}
								initials={s.initials} avatarColors={s.avatarColors} allergyAlerts={s.allergyAlerts}
								acutePainAlerts={s.acutePainAlerts} upcomingAppointment={s.upcomingAppointment}
								callAttribution={s.callAttribution} whatsappSent={s.whatsappSent} onSendWhatsApp={s.handleSendWhatsApp}
								onQuickBook={s.handleQuickBook}
								onOpenCard={() => { if (s.resolvedPatient) s.setSelectedPatientId(s.resolvedPatient.id); else if (s.activeCall?.phone) s.setNewPatientPhone(s.activeCall.phone); s.connectCall(); s.openCallDrawer(); }}
								showWidgetMoreMenu={s.showWidgetMoreMenu} onToggleWidgetMoreMenu={() => s.setShowWidgetMoreMenu((p) => !p)}
								onCloseWidgetMoreMenu={() => s.setShowWidgetMoreMenu(false)} isCapturingLead={s.isCapturingLead}
								onCaptureLead={s.handleCaptureLead} isHeld={s.isHeld} onToggleHold={s.toggleHold}
								onCopyPhone={() => { if (s.activeCall?.phone) { navigator.clipboard?.writeText(s.activeCall.phone); showToast("Номер телефона скопирован", "info"); } }}
								isCreatingPatient={s.isCreatingPatient} onQuickCreatePatient={s.handleQuickCreatePatient}
								isWsConnected={s.isWsConnected} onSwitchToDialer={() => s.setActiveTab("dialer")}
							/>
						</>
					)}
					{s.activeTab === "dialer" && (
						<TelephonyDialpad dialNumber={s.dialNumber} onDialNumberChange={s.setDialNumber} onDialDigit={s.handleDialDigit} onDialBackspace={s.handleDialBackspace} onStartOutgoingCall={s.handleStartOutgoingCall} dialInputRef={dialInputRef} />
					)}
					{s.activeTab === "history" && (
						<TelephonyRecentCallsList callHistory={s.callHistory} onRedial={(phone) => { s.setDialNumber(phone); s.setActiveTab("dialer"); }} onSendWhatsApp={() => s.handleSendWhatsApp()} />
					)}
				</div>
			</div>
		</div>
	);
}
