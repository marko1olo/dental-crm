/**
 * apps/web/src/components/telephony/DirectTelephonyLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Direct Telephony Studio Launcher.
 * Deep Link Mount: #telephony, #calls, #softphone, ?telephony=1, ?calls=1.
 * Mounts in AppShell & StandaloneLaunchers (Mandates 8b, 8aq, Sweet Spot <= 150 lines).
 */

import React, { useState, useEffect, useCallback } from "react";
import { TelephonyStudioModal } from "./TelephonyStudioModal";

function checkIsTelephonyActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("telephony") ||
		h.includes("calls") ||
		h.includes("softphone") ||
		params.get("telephony") === "1" ||
		params.get("calls") === "1"
	);
}

export const DirectTelephonyLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState(checkIsTelephonyActive);
	const [isOpen, setIsOpen] = useState(true);

	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("dark") || hash.includes("dark")) return "dark";
			if (document.documentElement.classList.contains("dark")) return "dark";
		}
		return "light";
	});

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

	useEffect(() => {
		if (typeof document !== "undefined") {
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
		}
	}, [theme]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			if (
				window.location.hash.includes("telephony") ||
				window.location.hash.includes("calls") ||
				window.location.hash.includes("softphone")
			) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	if (!isActive) return null;

	return (
		<main
			data-testid="direct-telephony-launcher-root"
			className="fixed inset-0 z-[100000] w-full h-full bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-2 sm:p-4"
		>
			<div className="fixed top-3 right-3 z-40 hidden sm:flex items-center gap-2 bg-[var(--paper-strong)] border border-[var(--line)] px-3 py-1.5 rounded-xl shadow-xs">
				<span className="text-xs text-[var(--ink-muted)]">Тема:</span>
				<button
					type="button"
					onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
					data-testid="telephony-theme-toggle-btn"
					className="text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
				>
					{theme === "dark" ? "Тёмная тема" : "Светлая тема"}
				</button>
			</div>

			<TelephonyStudioModal isOpen={isOpen} onClose={handleClose} />
		</main>
	);
};

export default DirectTelephonyLauncher;
