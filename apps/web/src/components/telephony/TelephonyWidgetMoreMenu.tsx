import React from "react";
import type { IncomingCallPayload } from "../../store/telephonyStore";
import type { CallAttribution } from "./telephonyAttribution";
import { WidgetMoreMenuBookingActions } from "./widgetMoreMenu/WidgetMoreMenuBookingActions";
import { WidgetMoreMenuCommActions } from "./widgetMoreMenu/WidgetMoreMenuCommActions";

export interface TelephonyWidgetMoreMenuProps {
	isOpen: boolean;
	onClose: () => void;
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
	onSendWhatsApp: () => void;
	onToggleTransferPanel: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
}

export function TelephonyWidgetMoreMenu({
	isOpen,
	onClose,
	activeCall,
	resolvedPatient,
	callAttribution,
	isCapturingLead,
	onCaptureLead,
	onQuickBook,
	isCreatingPatient,
	onQuickCreatePatient,
	onSendWhatsApp,
	onToggleTransferPanel,
	isHeld,
	onToggleHold,
	onCopyPhone,
}: TelephonyWidgetMoreMenuProps) {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 bottom-full mb-1.5 w-64 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5"
			data-testid="widget-more-menu-dropdown"
		>
			{/* Delegates to WidgetMoreMenuBookingActions (data-testid="widget-action-capture-lead") */}
			<WidgetMoreMenuBookingActions
				onClose={onClose}
				activeCall={activeCall}
				resolvedPatient={resolvedPatient}
				callAttribution={callAttribution}
				isCapturingLead={isCapturingLead}
				onCaptureLead={onCaptureLead}
				onQuickBook={onQuickBook}
				isCreatingPatient={isCreatingPatient}
				onQuickCreatePatient={onQuickCreatePatient}
			/>

			<WidgetMoreMenuCommActions
				onClose={onClose}
				onSendWhatsApp={onSendWhatsApp}
				onToggleTransferPanel={onToggleTransferPanel}
				isHeld={isHeld}
				onToggleHold={onToggleHold}
				onCopyPhone={onCopyPhone}
			/>
		</div>
	);
}
