/**
 * DirectCashboxSsotLauncher.tsx — Standalone launcher for Cashbox SSOT screens.
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor/Cashier Autonomy), Mandate 8aq (Mounted in UI Tree).
 */

import React, { useEffect, useState } from "react";
import { StandaloneCashboxSsotHost } from "../appLayout/modalsContainerModules/standalone/administrative/StandaloneCashboxSsotHost";

export const DirectCashboxSsotLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h.includes("cashbox") ||
			h.includes("cashbox_ssot") ||
			h.includes("cash_register") ||
			h.includes("shift_closing") ||
			h.includes("shift_journal") ||
			s.includes("cashbox") ||
			s.includes("cashbox_ssot")
		);
	});

	useEffect(() => {
		const checkUrl = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			setIsOpen(
				h.includes("cashbox") ||
				h.includes("cashbox_ssot") ||
				h.includes("cash_register") ||
				h.includes("shift_closing") ||
				h.includes("shift_journal") ||
				s.includes("cashbox") ||
				s.includes("cashbox_ssot")
			);
		};

		window.addEventListener("hashchange", checkUrl);
		window.addEventListener("popstate", checkUrl);
		return () => {
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(
				/#cashbox_ssot|#cashbox|#cash_register|#shift_closing|#shift_journal/g,
				""
			);
			const url = new URL(window.location.href);
			url.searchParams.delete("cashbox");
			url.searchParams.delete("cashbox_ssot");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<div className="fixed inset-0 z-[9999] overflow-y-auto bg-[var(--paper-soft,#f8fafc)]">
			<StandaloneCashboxSsotHost onClose={handleClose} />
		</div>
	);
};
