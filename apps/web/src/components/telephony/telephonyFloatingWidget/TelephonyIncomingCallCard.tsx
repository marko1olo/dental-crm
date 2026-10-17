/**
 * @file TelephonyIncomingCallCard.tsx
 * @description Layer 4: Presentation subcomponent for caller patient identification.
 * Displays patient details, balance, visit history, somatic alerts, upcoming appointments, and 1-click booking/intake.
 */

import { CalendarCheck, MoreHorizontal, User } from "lucide-react";
import React from "react";
import { TelephonyWidgetMoreMenu } from "../TelephonyWidgetMoreMenu";
import { TelephonyCallerIdentityCard } from "./incomingCallCard/TelephonyCallerIdentityCard";
import { TelephonyCardClinicalDetails } from "./incomingCallCard/TelephonyCardClinicalDetails";
import { TelephonyFallbackLineCard } from "./incomingCallCard/TelephonyFallbackLineCard";
import type { TelephonyIncomingCallCardProps } from "./types";

export function TelephonyIncomingCallCard(props: TelephonyIncomingCallCardProps) {
	const {
		activeCall, resolvedPatient, financialSummary, lastVisitSummary, callerName, formattedPhone,
		initials, avatarColors, allergyAlerts, acutePainAlerts, upcomingAppointment, callAttribution,
		whatsappSent, onSendWhatsApp, onQuickBook, onOpenCard, showWidgetMoreMenu, onToggleWidgetMoreMenu,
		onCloseWidgetMoreMenu, isCapturingLead, onCaptureLead, isHeld, onToggleHold, onCopyPhone,
		isCreatingPatient, onQuickCreatePatient, isWsConnected, onSwitchToDialer,
	} = props;

	if (!activeCall) {
		return <TelephonyFallbackLineCard isWsConnected={isWsConnected} onSwitchToDialer={onSwitchToDialer} />;
	}

	const isKnownPatient = Boolean(resolvedPatient);

	return (
		<div className="space-y-2.5" data-testid="telephony-incoming-call-card">
			<div className="dnt-caller-card space-y-2.5">
				<TelephonyCallerIdentityCard
					callerName={callerName}
					formattedPhone={formattedPhone}
					initials={initials}
					avatarColors={avatarColors}
					isKnownPatient={isKnownPatient}
					isWsConnected={isWsConnected}
					callAttribution={callAttribution}
					financialSummary={financialSummary}
					lastVisitSummary={lastVisitSummary}
				/>

				<TelephonyCardClinicalDetails
					allergyAlerts={allergyAlerts}
					acutePainAlerts={acutePainAlerts}
					upcomingAppointment={upcomingAppointment}
					whatsappSent={whatsappSent}
					onSendWhatsApp={onSendWhatsApp}
					isKnownPatient={isKnownPatient}
					isCreatingPatient={isCreatingPatient}
					onQuickCreatePatient={onQuickCreatePatient}
				/>
			</div>

			{/* Primary Transactional Buttons (Miller's Law <= 2 Direct Actions + '...') */}
			<div className="dnt-actions-footer">
				<button
					type="button"
					onClick={() => onQuickBook("urgent")}
					className="primary-button dnt-cta-primary flex-1 whitespace-nowrap"
					data-testid="widget-action-book"
					title={isKnownPatient ? "Записать пациента на приём в расписание" : "+ Быстрая запись"}
				>
					<CalendarCheck size={14} className="shrink-0" />
					<span>{isKnownPatient ? "Записать на приём" : "+ Быстрая запись"}</span>
				</button>

				<button
					type="button"
					onClick={onOpenCard}
					className="secondary-button dnt-cta-secondary flex-1"
					data-testid="widget-action-open-card"
					title="Открыть электронную медкарту пациента"
				>
					<User size={14} />
					<span>{isKnownPatient ? "Открыть карту" : "Создать карту"}</span>
				</button>

				<div className="relative">
					<button
						type="button"
						onClick={onToggleWidgetMoreMenu}
						className="icon-button dnt-btn-icon dnt-btn-more"
						data-testid="widget-more-menu-btn"
						title="Дополнительные действия"
						aria-label="Дополнительные действия"
					>
						<MoreHorizontal size={16} />
					</button>

					{showWidgetMoreMenu && (
						<TelephonyWidgetMoreMenu
							isOpen={showWidgetMoreMenu}
							onClose={onCloseWidgetMoreMenu}
							activeCall={activeCall}
							resolvedPatient={resolvedPatient}
							callAttribution={callAttribution}
							isCapturingLead={isCapturingLead}
							onCaptureLead={onCaptureLead}
							onQuickBook={onQuickBook}
							isCreatingPatient={isCreatingPatient}
							onQuickCreatePatient={() => onQuickCreatePatient()}
							onSendWhatsApp={onSendWhatsApp}
							onToggleTransferPanel={() => {}}
							isHeld={isHeld}
							onToggleHold={onToggleHold}
							onCopyPhone={onCopyPhone}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
