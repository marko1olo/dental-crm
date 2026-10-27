/**
 * DENTE Dental CRM — Direct Waitlist Matches Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 */
import React, { useEffect, useState } from "react";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

export const DirectWaitlistMatchesLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		const match = (
			s.includes("waitlist-matches") ||
			s.includes("waitlist_matches") ||
			h.includes("waitlist-matches") ||
			h.includes("waitlist_matches")
		);
		console.log("[LAUNCHER INIT] search:", s, "hash:", h, "match:", match);
		return match;
	});

	useEffect(() => {
		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			setIsOpen(
				s.includes("waitlist-matches") ||
				s.includes("waitlist_matches") ||
				h.includes("waitlist-matches") ||
				h.includes("waitlist_matches"),
			);
		};
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("waitlist-matches");
			url.searchParams.delete("waitlist_matches");
			const cleanHash = window.location.hash.replace(/#waitlist-matches|#waitlist_matches/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[1000] flex flex-col bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="standalone-waitlist-matches-root"
		>
			<div className="max-w-4xl mx-auto w-full space-y-4">
				<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
					<h2 className="text-base font-bold text-[var(--ink)]">
						Подбор пациентов из листа ожидания в освободившееся окно
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
					>
						Закрыть
					</button>
				</div>
				<WaitlistMatchesBlock appointmentId="demo-freed-slot-1" compact={false} />
			</div>
		</div>
	);
};

export default DirectWaitlistMatchesLauncher;
