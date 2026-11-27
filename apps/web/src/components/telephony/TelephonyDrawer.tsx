import { ExternalLink } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { TelephonyDrawerHeader } from "./TelephonyDrawerHeader";
import { TelephonyActiveCallPanel } from "./drawerModules/TelephonyActiveCallPanel";
import { TelephonyCallLogList } from "./TelephonyCallList";
import { TelephonyMissedCallsAlertBar } from "./drawerModules/TelephonyMissedCallsAlertBar";
import { TelephonyDrawerTabs } from "./drawerModules/TelephonyDrawerTabs";
import { useTelephonyDrawerController } from "./drawerModules/useTelephonyDrawerController";
import type { TelephonyDrawerProps } from "./drawerModules/telephonyDrawerTypes";
if (typeof document !== "undefined") {
	import("./styles/telephonyCapsuleAndDrawer.css");
}

export type { TelephonyDrawerProps };
export * from "./drawerModules/telephonyDrawerTypes";
export { TelephonyCallLogList } from "./TelephonyCallList";
export { TelephonyMissedCallsAlertBar } from "./drawerModules/TelephonyMissedCallsAlertBar";

export function TelephonyDrawer(props: TelephonyDrawerProps = {}): React.JSX.Element | null {
	const ctrl = useTelephonyDrawerController(props.isOpen, props.onClose, props.call);
	const {
		isDrawerOpen, handleClose, currentCall, hasPrimaryModal, isFullScreenStudioActive,
		dashboard, callHistory, activeTab, setActiveTab, activeFilter, setActiveFilter,
		isCallAnswered, callData, handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation, handleOpenFullPatientView, handleCaptureLead,
		handleQuickBookFromLog, handleCallbackFromLog, handleOpenPatientFromLog,
		setShowTransferPanel, setShowOutcomePanel, isCapturingLead, smsCopied,
		isDoctorMode, isSterileClinicalScreen,
	} = ctrl;

	if (!isDrawerOpen || hasPrimaryModal || isFullScreenStudioActive || isDoctorMode || isSterileClinicalScreen) {
		return null;
	}

	const content = (
		<section
			className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[50] bg-[var(--paper-strong)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
			style={{ zIndex: 50 }}
			aria-label="Боковая шторка телефонии"
			data-testid="telephony-patient-side-drawer"
		>
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft)] shrink-0" aria-hidden="true">
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong,rgba(0,0,0,0.25))] dark:bg-[rgba(255,255,255,0.25)]" />
				</div>
				<TelephonyDrawerHeader
					onClose={handleClose}
					isKnownPatient={callData.isKnownPatient}
					callAttribution={callData.callAttribution}
					currentCall={currentCall}
					isCapturingLead={isCapturingLead}
					onCaptureLead={handleCaptureLead}
					upcomingAppointment={callData.upcomingAppointment}
					onSendWhatsApp={handleSendWhatsAppConfirmation}
					onCopySms={handleCopySmsConfirmation}
					smsCopied={smsCopied}
					isCallAnswered={isCallAnswered}
					onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
					onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
					onOpenFullPatientView={handleOpenFullPatientView}
				/>

				{currentCall && <TelephonyDrawerTabs activeTab={activeTab} onSelectTab={setActiveTab} />}

				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
					{activeTab === "call" && currentCall ? (
						<TelephonyActiveCallPanel ctrl={ctrl} />
					) : (
						<div className="space-y-3.5">
							<TelephonyMissedCallsAlertBar callHistory={callHistory} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
							<TelephonyCallLogList
								callHistory={callHistory}
								activeFilter={activeFilter}
								patients={dashboard?.patients}
								onQuickBookFromLog={handleQuickBookFromLog}
								onCallbackFromLog={handleCallbackFromLog}
								onOpenPatientFromLog={handleOpenPatientFromLog}
							/>
						</div>
					)}
				</div>

				<div className="shrink-0 p-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2">
					<button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] transition-all min-h-[44px] cursor-pointer">
						Закрыть шторку
					</button>
					<button type="button" onClick={handleOpenFullPatientView} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] px-2.5 rounded-lg hover:bg-[var(--primary-soft,rgba(13,148,136,0.1))] transition-colors" title="Перейти в реестр пациентов">
						<span>Открыть в реестре</span>
						<ExternalLink size={12} />
					</button>
				</div>
			</section>
	);

	if (typeof document === "undefined") {
		return content;
	}

	return createPortal(content, document.body);
}

export default TelephonyDrawer;
