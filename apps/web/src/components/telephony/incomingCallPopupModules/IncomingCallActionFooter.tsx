import { CalendarCheck, MoreHorizontal, UserCheck } from "lucide-react";
import React from "react";
import { IncomingCallBadgeMoreMenu } from "../IncomingCallBadgeMoreMenu";
import type { IncomingCallActionFooterProps } from "./types";

export function IncomingCallActionFooter({
	ctrl,
}: IncomingCallActionFooterProps): React.JSX.Element | null {
	const {
		currentCall,
		isKnownPatient,
		callAttribution,
		isCapturingLead,
		quickSlots,
		upcomingAppointment,
		smsCopied,
		isCallAnswered,
		isMuted,
		isDndActive,
		showBadgeMoreMenu,
		setShowBadgeMoreMenu,
		setShowTransferPanel,
		setShowOutcomePanel,
		handleQuickBook,
		handleToggleCardDrawer,
		handleCaptureLead,
		handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation,
		handleCopyPhone,
		handleStartQuickCreateFromMenu,
		toggleMute,
		handleToggleDnd,
		handleOpenFullPatientView,
		handleRecordOutcome,
	} = ctrl;

	if (!currentCall) return null;

	return (
		<div className="flex items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
			<button
				type="button"
				onClick={() => handleQuickBook("today_standard")}
				className="dnt-telephony-primary-btn flex-1 min-h-[44px] px-3 py-2 rounded-xl text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
				title={isKnownPatient ? "Создать запись на приём" : "+ Записать нового пациента"}
				data-testid="badge-action-book"
			>
				<CalendarCheck size={16} className="shrink-0" />
				<span>{isKnownPatient ? "Создать запись" : "+ Записать нового пациента"}</span>
			</button>

			<button
				type="button"
				onClick={handleToggleCardDrawer}
				className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
				title={isKnownPatient ? "Открыть карту пациента" : "Создать нового пациента"}
				aria-label={isKnownPatient ? "Открыть карту пациента" : "Создать нового пациента"}
				data-testid="badge-action-card"
			>
				<UserCheck size={16} className="text-[var(--teal)]" />
				<span>{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}</span>
			</button>

			{/* Menu ... (Consolidated Secondary Actions) */}
			<div className="relative" data-badge-more-container="true">
				<button
					type="button"
					onClick={() => setShowBadgeMoreMenu((prev) => !prev)}
					className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer border border-[var(--line,#e2e8f0)]"
					title="Дополнительные действия (слоты записи, WhatsApp, SMS, перевод)"
					aria-label="Дополнительные действия"
					data-testid="badge-more-menu-btn"
				>
					<MoreHorizontal size={18} />
				</button>

				{showBadgeMoreMenu && (
					<IncomingCallBadgeMoreMenu
						isKnownPatient={isKnownPatient}
						callAttribution={callAttribution}
						currentCall={currentCall}
						isCapturingLead={isCapturingLead}
						onCaptureLead={handleCaptureLead}
						onQuickBook={handleQuickBook}
						quickSlots={quickSlots}
						upcomingAppointment={upcomingAppointment}
						onSendWhatsApp={handleSendWhatsAppConfirmation}
						onCopySms={handleCopySmsConfirmation}
						smsCopied={smsCopied}
						onCopyPhone={handleCopyPhone}
						isCallAnswered={isCallAnswered}
						onToggleTransferPanel={() => {
							setShowTransferPanel((prev) => !prev);
							handleToggleCardDrawer();
						}}
						onQuickCreatePatient={handleStartQuickCreateFromMenu}
						isMuted={isMuted}
						onToggleMute={toggleMute}
						isDndActive={isDndActive}
						onToggleDnd={handleToggleDnd}
						onToggleOutcomePanel={() => {
							setShowOutcomePanel((prev) => !prev);
							handleToggleCardDrawer();
						}}
						onOpenFullPatientView={handleOpenFullPatientView}
						onClose={() => setShowBadgeMoreMenu(false)}
						onRecordOutcome={handleRecordOutcome}
					/>
				)}
			</div>
		</div>
	);
}
