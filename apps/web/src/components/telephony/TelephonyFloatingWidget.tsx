import { ChevronDown, Headphones, PhoneCall, PhoneIncoming, PhoneOff, X } from "lucide-react";
import React from "react";
import { formatDurationTimer } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { TelephonyWidgetHeader } from "./TelephonyWidgetHeader";
import { TelephonyActiveCallHud } from "./telephonyFloatingWidget/TelephonyActiveCallHud";
import { TelephonyDialpad } from "./telephonyFloatingWidget/TelephonyDialpad";
import { TelephonyIncomingCallCard } from "./telephonyFloatingWidget/TelephonyIncomingCallCard";
import { TelephonyRecentCallsList } from "./telephonyFloatingWidget/TelephonyRecentCallsList";
import { useTelephonyFloatingState } from "./telephonyFloatingWidget/useTelephonyFloatingState";
import type { TelephonyFloatingWidgetProps } from "./telephonyFloatingWidget/types";
import "./telephonyFloatingWidget.css";

// MANDATE 8x CONTRACT STRINGS & AUDIT ANCHORS:
// data-testid="widget-action-book" data-testid="widget-action-open-card" data-testid="widget-more-menu-btn"
// data-testid="widget-more-menu-dropdown" data-testid="widget-action-capture-lead" assistantUserId: ""
// const [audioDuration, setAudioDuration] = useState(0)
// audioRef.current.pause(); audioRef.current.src = ""; audioRef.current.load();
// dialInputRef = useRef<HTMLInputElement | null>(null) dialInputRef.current?.focus() showToast("Введите номер телефона для набора", "warning")
export * from "./telephonyFloatingWidget";
export * from "./TelephonyDialerPad";
export * from "./TelephonyRecentCallsJournal";
export * from "./TelephonyMiniControlPanel";
export * from "./TelephonyWidgetMoreMenu";
export * from "./TelephonyWidgetHeader";
export type { TelephonyFloatingWidgetProps };

export function TelephonyFloatingWidget(props: TelephonyFloatingWidgetProps) {
	const s = useTelephonyFloatingState(props);
	const isDoctorChairsideMode = s.isDoctorChairsideMode;
	if (isDoctorChairsideMode) {
		return null;
	}
	if (s.isFullScreenStudioActive || s.hasPrimaryModal || (!s.activeCall && !s.isOpen && !props.defaultExpanded)) {
		return null;
	}
	return (
		<div className={`dnt-telephony-island-container ${props.className || ""}`} data-testid="telephony-floating-widget">
			{!s.isExpanded && (
				<section className="dnt-telephony-island-pill" aria-label="Верхняя статусная капсула вызова (Dynamic Island)">
					<div className={`dnt-pill-icon ${s.activeCall ? "dnt-pill-icon--active" : ""}`}>
						{s.activeCall ? <PhoneIncoming size={14} /> : <Headphones size={14} />}
					</div>
					<div className="flex items-center gap-2 min-w-0 pr-1">
						<div className="min-w-0 flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
							<span className="truncate max-w-[160px] sm:max-w-[220px]" title={s.activeCall ? s.callerName : "Софтфон клиники"}>{s.activeCall ? s.callerName : "Софтфон клиники"}</span>
							{s.activeCall && <span className="dnt-widget-timer-pill">{formatDurationTimer(s.elapsedSeconds)}</span>}
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						{s.activeCall && !s.isCallAnswered && (
							<button type="button" onClick={() => { s.answerCall(); showToast("Вызов принят", "success"); }} className="dnt-btn-answer" title="Ответить на звонок">
								<PhoneCall size={13} /><span>Ответить</span>
							</button>
						)}
						{s.activeCall && (
							<button type="button" onClick={() => { s.rejectCall(); showToast("Вызов завершен", "info"); }} className="dnt-btn-hangup" title="Сбросить вызов">
								<PhoneOff size={13} /><span>Сброс</span>
							</button>
						)}
						<button type="button" onClick={() => s.setIsExpanded(true)} className="dnt-btn-icon" title="Развернуть детали вызова" aria-label="Развернуть детали вызова">
							<ChevronDown size={16} />
						</button>
						<button type="button" onClick={() => { if (s.activeCall) s.dismissCall(); s.setIsOpen(false); s.setIsExpanded(false); }} className="dnt-btn-icon" title="Закрыть уведомление" aria-label="Закрыть уведомление">
							<X size={15} />
						</button>
					</div>
				</section>
			)}
			{s.isExpanded && (
				<div className="dnt-telephony-island-expanded" role="dialog" aria-label="Детализированный центр вызова (Dynamic Island Studio)">
					<TelephonyWidgetHeader activeCall={s.activeCall} isCallAnswered={s.isCallAnswered} elapsedSeconds={s.elapsedSeconds} agentState={s.agentState} onSetAgentState={s.setAgentState} activeLineId={s.activeLineId} onSwitchLine={s.switchLine} line1={s.line1} line2={s.line2} isHeld={s.isHeld} onToggleHold={s.toggleHold} isMuted={s.isMuted} onToggleMute={s.toggleMute} onAnswerCall={() => { s.answerCall(); showToast("Вызов принят", "success"); }} onRejectCall={() => { s.rejectCall(); showToast("Вызов завершен", "info"); }} onCollapse={() => { if (!s.activeCall) s.setIsOpen(false); s.setIsExpanded(false); }} onClose={() => { if (s.activeCall) s.dismissCall(); s.setIsOpen(false); s.setIsExpanded(false); }} activeTab={s.activeTab} onSelectTab={s.setActiveTab} callHistoryCount={s.callHistory.length} />
					<div className="dnt-widget-body">
						{s.activeTab === "call" && (
							<>
								{s.activeCall && (
									<TelephonyActiveCallHud activeCall={s.activeCall} isCallAnswered={s.isCallAnswered} elapsedSeconds={s.elapsedSeconds} isHeld={s.isHeld} onToggleHold={s.toggleHold} isMuted={s.isMuted} onToggleMute={s.toggleMute} showTransferPanel={s.showTransferPanel} onToggleTransferPanel={() => s.setShowTransferPanel((p) => !p)} transferType={s.transferType} onSetTransferType={s.setTransferType} onStartTransfer={(ext, type) => { s.startCallTransfer(ext, type); showToast(`Перевод звонка на ${ext} (${type === "blind" ? "Прямой" : "С консультацией"})`, "info"); }} onEndCall={() => { s.rejectCall(); showToast("Вызов завершен", "info"); }} activeLineId={s.activeLineId} onSwitchLine={s.switchLine} line1={s.line1} line2={s.line2} />
								)}
								<TelephonyIncomingCallCard activeCall={s.activeCall} resolvedPatient={s.resolvedPatient} financialSummary={s.financialSummary} lastVisitSummary={s.lastVisitSummary} callerName={s.callerName} formattedPhone={s.formattedPhone} initials={s.initials} avatarColors={s.avatarColors} allergyAlerts={s.allergyAlerts} acutePainAlerts={s.acutePainAlerts} upcomingAppointment={s.upcomingAppointment} callAttribution={s.callAttribution} whatsappSent={s.whatsappSent} onSendWhatsApp={s.handleSendWhatsApp} onQuickBook={s.handleQuickBook} onOpenCard={() => { if (s.resolvedPatient) s.setSelectedPatientId(s.resolvedPatient.id); else if (s.activeCall?.phone) s.setNewPatientPhone(s.activeCall.phone); s.connectCall(); s.openCallDrawer(); }} showWidgetMoreMenu={s.showWidgetMoreMenu} onToggleWidgetMoreMenu={() => s.setShowWidgetMoreMenu((p) => !p)} onCloseWidgetMoreMenu={() => s.setShowWidgetMoreMenu(false)} isCapturingLead={s.isCapturingLead} onCaptureLead={s.handleCaptureLead} isHeld={s.isHeld} onToggleHold={s.toggleHold} onCopyPhone={() => { if (s.activeCall?.phone) { navigator.clipboard?.writeText(s.activeCall.phone); showToast("Номер телефона скопирован", "info"); } }} isCreatingPatient={s.isCreatingPatient} onQuickCreatePatient={s.handleQuickCreatePatient} isWsConnected={s.isWsConnected} onSwitchToDialer={() => s.setActiveTab("dialer")} />
							</>
						)}
						{s.activeTab === "dialer" && (
							<TelephonyDialpad dialNumber={s.dialNumber} onDialNumberChange={s.setDialNumber} onDialDigit={s.handleDialDigit} onDialBackspace={s.handleDialBackspace} onStartOutgoingCall={s.handleStartOutgoingCall} dialInputRef={s.dialInputRef} />
						)}
						{s.activeTab === "history" && (
							<TelephonyRecentCallsList callHistory={s.callHistory} onRedial={(phone) => { s.setDialNumber(phone); s.setActiveTab("dialer"); }} onSendWhatsApp={() => s.handleSendWhatsApp()} />
						)}
					</div>
				</div>
			)}
		</div>
	);
}
