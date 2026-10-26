/**
 * IncomingCallModal.tsx — Canonical Receptionist Call Intake Facade (Mandates 8b <= 50 lines, 8e, 8n)
 * 
 * Eliminates duplicate fullscreen blocking overlays. Delegates directly to SSOT IncomingCallPopup
 * ensuring Top Ambient Event Capsule and zero doctor sterile zone interference.
 */

import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { useTelephonyStore } from "../../store/telephonyStore";
import { IncomingCallPopup, type IncomingCallPopupProps } from "./IncomingCallPopup";

export interface IncomingCallModalProps extends IncomingCallPopupProps {
	isOpen?: boolean;
	onClose?: () => void;
}

export function IncomingCallModal({
	isOpen = true,
	onClose: _onClose,
	defaultExpanded = true,
	suppressCallModal = false,
}: IncomingCallModalProps): React.JSX.Element | null {
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
	// Suppressed on #visit, #odontogram, #periodontics, #xray, #cbct screens or for doctor role
	const isSterileZone =
		Boolean(suppressCallModal) ||
		selectedWorkspaceRole === "doctor" ||
		["visit", "odontogram", "periodontics", "xray", "radiology", "cbct"].includes(currentView as string) ||
		/#(visit|odontogram|periodontics|xray|radiology|cbct)/.test(hash);

	if (!isOpen || !activeCall || isSterileZone) {
		return null;
	}

	return <IncomingCallPopup defaultExpanded={defaultExpanded} suppressCallModal={suppressCallModal} />;
}

export default IncomingCallModal;
