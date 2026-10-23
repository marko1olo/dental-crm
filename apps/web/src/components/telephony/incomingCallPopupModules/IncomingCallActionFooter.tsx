import { CalendarCheck, MoreHorizontal, PhoneCall, UserCheck } from "lucide-react";
import React from "react";
import { IncomingCallBadgeMoreMenu } from "../IncomingCallBadgeMoreMenu";
import { initiateOutboundCall } from "../initiateOutboundCall";
import type { IncomingCallActionFooterProps } from "./types";

export function IncomingCallActionFooter({ ctrl }: IncomingCallActionFooterProps): React.JSX.Element | null {
	const {
		currentCall, isKnownPatient, callAttribution, isCapturingLead, quickSlots,
		upcomingAppointment, smsCopied, isCallAnswered, isMuted, isDndActive,
		showBadgeMoreMenu, setShowBadgeMoreMenu, setShowTransferPanel, setShowOutcomePanel,
		handleQuickBook, handleToggleCardDrawer, handleCaptureLead, handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation, handleCopyPhone, handleStartQuickCreateFromMenu,
		toggleMute, handleToggleDnd, handleOpenFullPatientView, handleRecordOutcome,
	} = ctrl;

	if (!currentCall) return null;

	const handleCallback = () => {
		void initiateOutboundCall({
			phone: currentCall.phone,
			patientId: currentCall.patientId,
			patientName: currentCall.patientName,
		});
	};

	return (
		<div className="flex items-center gap-1.5 sm:gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
			<button
				type="button"
				onClick={() => handleQuickBook("today_standard")}
				className="primary-button flex-1 min-h-[44px] px-2 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1"
				title={isKnownPatient ? "Записать пациента на приём" : "+ Быстрая запись лида"}
				data-testid="badge-action-book"
			>
				<CalendarCheck size={15} className="shrink-0" />
				<span className="hidden sm:inline">{isKnownPatient ? "Записать" : "+ Запись"}</span>
				<span className="sm:hidden text-[11px]">Запись</span>
			</button>

			<button
				type="button"
				onClick={handleCallback}
				className="secondary-button min-h-[44px] px-2 sm:px-2.5 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1"
				title="Перезвонить пациенту (1 клик)"
				data-testid="badge-action-callback"
			>
				<PhoneCall size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span className="hidden sm:inline">Перезвонить</span>
			</button>

			<button
				type="button"
				onClick={handleToggleCardDrawer}
				className="secondary-button min-h-[44px] px-2 sm:px-2.5 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1"
				title={isKnownPatient ? "Открыть карту пациента" : "Создать карту пациента"}
				aria-label={isKnownPatient ? "Открыть карту пациента" : "Создать карту пациента"}
				data-testid="badge-action-card"
			>
				<UserCheck size={14} className="text-[var(--teal)] shrink-0" />
				<span className="hidden sm:inline">{isKnownPatient ? "Карта" : "+ Карта"}</span>
			</button>

			<div className="relative shrink-0" data-badge-more-container="true">
				<button
					type="button"
					onClick={() => setShowBadgeMoreMenu((prev) => !prev)}
					className="icon-button min-h-[44px] min-w-[44px]"
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					data-testid="badge-more-menu-btn"
				>
					<MoreHorizontal size={18} />
				</button>

				{showBadgeMoreMenu && (
					<IncomingCallBadgeMoreMenu
						isKnownPatient={isKnownPatient} callAttribution={callAttribution} currentCall={currentCall}
						isCapturingLead={isCapturingLead} onCaptureLead={handleCaptureLead} onQuickBook={handleQuickBook}
						quickSlots={quickSlots} upcomingAppointment={upcomingAppointment}
						onSendWhatsApp={handleSendWhatsAppConfirmation} onCopySms={handleCopySmsConfirmation}
						smsCopied={smsCopied} onCopyPhone={handleCopyPhone} isCallAnswered={isCallAnswered}
						onToggleTransferPanel={() => { setShowTransferPanel((p) => !p); handleToggleCardDrawer(); }}
						onQuickCreatePatient={handleStartQuickCreateFromMenu} isMuted={isMuted} onToggleMute={toggleMute}
						isDndActive={isDndActive} onToggleDnd={handleToggleDnd}
						onToggleOutcomePanel={() => { setShowOutcomePanel((p) => !p); handleToggleCardDrawer(); }}
						onOpenFullPatientView={handleOpenFullPatientView} onClose={() => setShowBadgeMoreMenu(false)}
						onRecordOutcome={handleRecordOutcome}
					/>
				)}
			</div>
		</div>
	);
}
