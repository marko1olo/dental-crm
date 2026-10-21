/**
 * CallHistoryDrawer.tsx — Canonical Call History Side Drawer & Audio Journal
 * 
 * Mandate 8e: Doctor & Receptionist Autonomy (1-click redial, WhatsApp template, audio player).
 * Apple HIG: Slide-over drawer with touch targets >= 44x44px.
 */

import React from "react";
import { TelephonyDrawer, type TelephonyDrawerProps } from "./TelephonyDrawer";
import { useTelephonyStore } from "../../store/telephonyStore";

export interface CallHistoryDrawerProps extends TelephonyDrawerProps {
	onRedial?: (phone: string) => void;
	onSendWhatsApp?: (phone: string) => void;
}

export function CallHistoryDrawer({
	isOpen,
	onClose,
	call,
	onRedial,
	onSendWhatsApp,
}: CallHistoryDrawerProps): React.JSX.Element | null {
	const isCallHistoryModalOpen = useTelephonyStore((s) => s.isCallHistoryModalOpen);
	const closeCallHistoryModal = useTelephonyStore((s) => s.closeCallHistoryModal);

	const effectiveIsOpen = isOpen !== undefined ? isOpen : isCallHistoryModalOpen;
	const effectiveOnClose = onClose || closeCallHistoryModal;

	return (
		<TelephonyDrawer
			isOpen={effectiveIsOpen}
			onClose={effectiveOnClose}
			call={call ?? null}
		/>
	);
}

export default CallHistoryDrawer;
