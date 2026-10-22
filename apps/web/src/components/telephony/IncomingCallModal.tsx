/**
 * IncomingCallModal.tsx — Canonical Receptionist Call Intake & Doctor Sterile Zone Modal
 * 
 * Mandate 8e: Doctor & chairside immunity (popups strictly suppressed on #visit, #odontogram).
 * Mandate 8n: Solo-doctor & small clinic autonomy (1-click direct booking, zero bureaucracy).
 * Apple HIG: Mobile bottom sheet with touch targets >= 44x44px, drag handle, and swipe to dismiss.
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../../store/appStore";
import { useTelephonyStore } from "../../store/telephonyStore";
import {
	IncomingCallHeaderBar,
	IncomingCallPatientContextCard,
	IncomingCallQuickBookingSection,
	IncomingCallActionFooter,
	IncomingCallDrawerPortal,
	useIncomingCallPopupController,
} from "./incomingCallPopupModules";
import "./telephonyFloatingWidget.css";

export interface IncomingCallModalProps {
	isOpen?: boolean;
	onClose?: () => void;
	defaultExpanded?: boolean;
	suppressCallModal?: boolean;
}

export function IncomingCallModal({
	isOpen = true,
	onClose,
	defaultExpanded = true,
	suppressCallModal = false,
}: IncomingCallModalProps): React.JSX.Element | null {
	const ctrl = useIncomingCallPopupController(defaultExpanded, suppressCallModal);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

	useEffect(() => {
		const handleHashChange = () => setHash(window.location.hash);
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	// Clinical Doctor Immunity Invariant (Mandates 8e, 8n):
	// Popups are suppressed on #visit, #odontogram, #periodontics screens or for doctor role
	const isSterileZone =
		suppressCallModal ||
		selectedWorkspaceRole === "doctor" ||
		(currentView as string) === "visit" ||
		(currentView as string) === "odontogram" ||
		(currentView as string) === "periodontics" ||
		hash.includes("#visit") ||
		hash.includes("#odontogram") ||
		hash.includes("#periodontics");

	if (!isOpen || !activeCall || isSterileZone || ctrl.isDndActive || ctrl.isFullScreenStudioActive || !ctrl.currentCall) {
		return null;
	}

	const content = (
		<div className="dnt-incoming-call-modal-overlay fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto" data-testid="incoming-call-modal">
			<section
				className="dnt-incoming-call-card relative w-full max-w-[520px] rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 box-border animate-badge-drop"
				aria-label="Входящий звонок"
				role="dialog"
				aria-modal="true"
			>
				{/* Header with caller identity, carrier badge & close */}
				<IncomingCallHeaderBar ctrl={ctrl} />

				{/* Patient Context Card: category, balance, debt, last visit */}
				<IncomingCallPatientContextCard ctrl={ctrl} />

				{/* 1-Click Quick Booking Section for reception desk */}
				<IncomingCallQuickBookingSection ctrl={ctrl} />

				{/* Action Footer: 1 Primary CTA ("Создать запись"), Secondary ("Карточка"), Consolidated Menu */}
				<IncomingCallActionFooter ctrl={ctrl} />
			</section>

			{/* Full details slide-over drawer if requested by receptionist */}
			<IncomingCallDrawerPortal ctrl={ctrl} />
		</div>
	);

	if (typeof document === "undefined") {
		return content;
	}

	return createPortal(content, document.body);
}

export default IncomingCallModal;
