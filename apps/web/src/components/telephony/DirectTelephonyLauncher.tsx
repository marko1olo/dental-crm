/**
 * apps/web/src/components/telephony/DirectTelephonyLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Direct Telephony Studio Launcher.
 * Deep Link Mount: #telephony, #calls, #softphone, ?telephony=1, ?calls=1.
 * Mounts in AppShell & StandaloneLaunchers (Mandates 8b, 8aq, Sweet Spot 60-80 lines).
 */

import React, { useState, useEffect, useCallback } from "react";
import { TelephonyStudioModal } from "./TelephonyStudioModal";
import { TelephonySoftphonePopover } from "./headerCapsule/TelephonySoftphonePopover";

function checkIsTelephonyActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	if (h.includes("recalls") || s.includes("recalls")) return false;
	const params = new URLSearchParams(s);
	return (
		h.includes("telephony") ||
		h.includes("calls") ||
		h.includes("softphone") ||
		params.get("telephony") === "1" ||
		params.get("calls") === "1" ||
		params.get("softphone") === "1"
	);
}

export const DirectTelephonyLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsTelephonyActive);
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsTelephonyActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};
		const handleOpenTelephony = () => {
			setIsActive(true);
			setIsOpen(true);
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-telephony", handleOpenTelephony);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-telephony", handleOpenTelephony);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			const h = window.location.hash;
			if (h.includes("telephony") || h.includes("calls") || h.includes("softphone")) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	if (!isActive) return null;

	const isSoftphone = typeof window !== "undefined" && (
		window.location.hash.includes("softphone") ||
		new URLSearchParams(window.location.search).get("softphone") === "1"
	);

	if (isSoftphone) {
		const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
		return (
			<main
				data-testid="direct-telephony-launcher-root"
				className="fixed inset-0 z-[100000] w-full h-full bg-[var(--paper-soft)]/60 backdrop-blur-md text-[var(--ink)] flex flex-col items-center justify-center p-2 sm:p-4"
			>
				<TelephonySoftphonePopover onClose={handleClose} isMobile={isMobile} isStandalone={true} />
			</main>
		);
	}

	return (
		<main
			data-testid="direct-telephony-launcher-root"
			className="fixed inset-0 z-[100000] w-full h-full bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-2 sm:p-4"
		>
			<TelephonyStudioModal isOpen={isOpen} onClose={handleClose} />
		</main>
	);
};

export default DirectTelephonyLauncher;
