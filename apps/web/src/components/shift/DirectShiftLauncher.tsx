/**
 * apps/web/src/components/shift/DirectShiftLauncher.tsx
 *
 * Canonical UI Mount Launcher for Cash Shift Closing & Cash Register Studio SSOT.
 * Governed by:
 * - Mandate 8aq: Mounted directly into live AppShell DOM tree.
 * - Mandate 8e: Doctor & Cashier Autonomy.
 * - Mandate 8b: Facade size Sweet Spot <= 80 lines.
 */

import React, { useEffect, useState, useCallback } from "react";
import { CashShiftClosingModal } from "./CashShiftClosingModal";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal";

export const DirectShiftLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [launcherMode, setLauncherMode] = useState<"closing" | "studio">("studio");

	const checkUrl = useCallback(() => {
		if (typeof window === "undefined") return;
		const h = window.location.hash.toLowerCase();
		const s = window.location.search.toLowerCase();

		const isClosing =
			h.includes("shift-closing") ||
			h.includes("z-report") ||
			s.includes("shift_closing") ||
			s.includes("z_report");

		const isShift =
			h === "#shift" ||
			h.startsWith("#shift?") ||
			h.includes("cash-shift") ||
			h.includes("shift-studio") ||
			h.includes("shift_studio") ||
			s.includes("shift=1") ||
			s.includes("shift_studio=1") ||
			isClosing;

		if (isShift) {
			setLauncherMode(isClosing ? "closing" : "studio");
			setIsOpen(true);
		}
	}, []);

	useEffect(() => {
		checkUrl();
		window.addEventListener("hashchange", checkUrl);
		window.addEventListener("popstate", checkUrl);

		const handleCustomOpen = (e: Event) => {
			const customEvent = e as CustomEvent<{ tab?: "current" | "closing" | "journal" }>;
			if (customEvent.detail?.tab === "closing") {
				setLauncherMode("closing");
			} else {
				setLauncherMode("studio");
			}
			setIsOpen(true);
		};

		window.addEventListener("dente:open-shift", handleCustomOpen);
		window.addEventListener("dente-open-shift", handleCustomOpen);
		window.addEventListener("dente:open-z-report", () => {
			setLauncherMode("closing");
			setIsOpen(true);
		});

		return () => {
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
			window.removeEventListener("dente:open-shift", handleCustomOpen);
			window.removeEventListener("dente-open-shift", handleCustomOpen);
		};
	}, [checkUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(
				/#shift|#cash-shift|#z-report|#shift-closing|#shift-studio|#shift_studio|#shift-journal/g,
				"",
			);
			const url = new URL(window.location.href);
			url.searchParams.delete("shift");
			url.searchParams.delete("cash_shift");
			url.searchParams.delete("z_report");
			url.searchParams.delete("shift_closing");
			url.searchParams.delete("shift_studio");
			url.searchParams.delete("shift_journal");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	if (launcherMode === "closing") {
		return (
			<CashShiftClosingModal
				isOpen={isOpen}
				onClose={handleClose}
			/>
		);
	}

	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			mode="shift"
			initialTab="shift"
		/>
	);
};

export default DirectShiftLauncher;
