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
				className="primary-button flex-1 min-h-[44px] px-3.5 py-2 text-xs font-bold"
				title={isKnownPatient ? "Записать пациента на приём" : "+ Записать нового пациента"}
				data-testid="badge-action-book"
			>
				<CalendarCheck size={16} className="shrink-0" />
				<span>{isKnownPatient ? "Записать на приём" : "+ Записать нового пациента"}</span>
			</button>

			<button
				type="button"
				onClick={handleToggleCardDrawer}
				className="secondary-button flex-1 min-h-[44px] px-3.5 py-2 text-xs font-bold"
				title={isKnownPatient ? "Открыть карту пациента" : "Создать карту пациента"}
				aria-label={isKnownPatient ? "Открыть карту пациента" : "Создать карту пациента"}
				data-testid="badge-action-card"
			>
				<UserCheck size={16} className="text-[var(--teal)] shrink-0" />
				<span>{isKnownPatient ? "Открыть карту" : "+ Создать карту"}</span>
			</button>

			{/* Menu ... (Consolidated Secondary Actions) */}
			<div className="relative" data-badge-more-container="true">
				<button
					type="button"
					onClick={() => setShowBadgeMoreMenu((prev) => !prev)}
					className="icon-button min-h-[44px] min-w-[44px]"
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
