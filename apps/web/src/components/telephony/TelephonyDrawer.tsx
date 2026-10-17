import { ExternalLink } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { TelephonyDialerModal } from "./TelephonyDialerModal";
import { TelephonyDrawerHeader } from "./TelephonyDrawerHeader";
import { TelephonyActiveCallPanel } from "./drawerModules/TelephonyActiveCallPanel";
import { TelephonyCallLogList } from "./drawerModules/TelephonyCallLogList";
import { TelephonyMissedCallsAlertBar } from "./drawerModules/TelephonyMissedCallsAlertBar";
import { TelephonyDrawerTabs } from "./drawerModules/TelephonyDrawerTabs";
import { useTelephonyDrawerController } from "./drawerModules/useTelephonyDrawerController";
import type { TelephonyDrawerProps } from "./drawerModules/telephonyDrawerTypes";
import "./telephonyFloatingWidget.css";

export type { TelephonyDrawerProps };
export * from "./drawerModules/telephonyDrawerTypes";
export { TelephonyCallLogList } from "./drawerModules/TelephonyCallLogList";
export { TelephonyMissedCallsAlertBar } from "./drawerModules/TelephonyMissedCallsAlertBar";

export function TelephonyDrawer(props: TelephonyDrawerProps = {}): React.JSX.Element | null {
	const ctrl = useTelephonyDrawerController(props.isOpen, props.onClose, props.call);
	const {
		isDrawerOpen, handleClose, currentCall, hasPrimaryModal, isFullScreenStudioActive,
		dashboard, callHistory, activeTab, setActiveTab, activeFilter, setActiveFilter,
		isDialerOpen, setIsDialerOpen, isCallAnswered, callData, handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation, handleOpenFullPatientView, handleCaptureLead,
		handleQuickBookFromLog, handleCallbackFromLog, handleOpenPatientFromLog,
		setShowTransferPanel, setShowOutcomePanel, isCapturingLead, smsCopied,
	} = ctrl;

	if (typeof document === "undefined" || !isDrawerOpen || hasPrimaryModal || isFullScreenStudioActive) {
		return null;
	}

	return createPortal(
		<>
			<section
				className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[9995] bg-[var(--paper-strong)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
				style={{ zIndex: 9995 }}
				aria-label="Боковая шторка телефонии"
				data-testid="telephony-patient-side-drawer"
			>
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
					<button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] transition-all min-h-[44px] cursor-pointer">
						Закрыть шторку
					</button>
					<button type="button" onClick={handleOpenFullPatientView} className="text-[11px] font-semibold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[44px] px-2" title="Перейти в реестр пациентов">
						<span>Открыть в реестре</span>
						<ExternalLink size={12} />
					</button>
				</div>
			</section>

			<TelephonyDialerModal isOpen={isDialerOpen} onClose={() => setIsDialerOpen(false)} />
		</>,
		document.body,
	);
}

export default TelephonyDrawer;
