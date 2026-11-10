/**
 * DirectTomorrowRemindersLauncher.tsx
 * Standalone direct launcher for TomorrowRemindersModal (Domain 4 SSOT).
 * Mandate 8b (Architecture Decomposition), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounting in live UI).
 */

import React, { useEffect, useState } from "react";
import { TomorrowRemindersModal } from "./TomorrowRemindersModal";
import { getCachedClinicDashboard, createOfflineFallbackDashboard } from "../../lib/offlineStorage";

export const DirectTomorrowRemindersLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("tomorrow-reminders") ||
			s.includes("tomorrow_reminders") ||
			s.includes("reminders") ||
			h.includes("tomorrow-reminders") ||
			h.includes("tomorrow_reminders") ||
			h.includes("reminders")
		);
	});

	useEffect(() => {
		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			setIsOpen(
				s.includes("tomorrow-reminders") ||
				s.includes("tomorrow_reminders") ||
				s.includes("reminders") ||
				h.includes("tomorrow-reminders") ||
				h.includes("tomorrow_reminders") ||
				h.includes("reminders")
			);
		};
		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);
		return () => {
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, []);

	if (!isOpen) return null;

	const dashboard = getCachedClinicDashboard() || createOfflineFallbackDashboard({ scale: "solo", hasDemoData: true });

	return (
		<div className="fixed inset-0 z-[99999] w-full h-screen min-h-screen p-2 sm:p-4 bg-[var(--paper)] text-[var(--ink)] box-border flex items-center justify-center overflow-hidden">
			<TomorrowRemindersModal
				dashboard={dashboard}
				isOpen={true}
				onClose={() => {
					setIsOpen(false);
					if (typeof window !== "undefined") {
						window.location.hash = "";
					}
				}}
			/>
		</div>
	);
};

export default DirectTomorrowRemindersLauncher;
