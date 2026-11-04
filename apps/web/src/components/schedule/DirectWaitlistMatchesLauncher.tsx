/**
 * DENTE Dental CRM — Direct Waitlist Matches Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 */
import React, { useEffect, useState } from "react";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";
import { WaitlistDrawer } from "./WaitlistDrawer";
import type { TargetSlotInfo } from "./waitlist/waitlistTypes";

const DEMO_TARGET_SLOT: TargetSlotInfo = {
	appointmentId: "demo-freed-slot-1",
	startsAt: new Date(Date.now() + 3600000).toISOString(),
	endsAt: new Date(Date.now() + 7200000).toISOString(),
	doctorUserId: "01a00000-0000-0000-0003-000000000001",
	doctorName: "Д-р Соколов А. В.",
	chairId: "01a00000-0000-0000-0002-000000000001",
	chairName: "Кабинет 1 (Терапия)",
	freedBecause: "Отмена приёма пациентом (окно 60 мин)",
};

export const DirectWaitlistMatchesLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("waitlist-matches") ||
			s.includes("waitlist_matches") ||
			h.includes("waitlist-matches") ||
			h.includes("waitlist_matches")
		);
	});

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [activeSlot, setActiveSlot] = useState<TargetSlotInfo | null>(DEMO_TARGET_SLOT);

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

	useEffect(() => {
		const handleOpenSlot = (e: Event) => {
			const customEvt = e as CustomEvent<TargetSlotInfo | null>;
			setActiveSlot(customEvt.detail || DEMO_TARGET_SLOT);
			setIsDrawerOpen(true);
		};
		window.addEventListener("dente:open-waitlist-for-slot", handleOpenSlot);
		return () => window.removeEventListener("dente:open-waitlist-for-slot", handleOpenSlot);
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		setIsDrawerOpen(false);
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
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
					<div>
						<h2 className="text-base font-bold text-[var(--ink,#0f172a)]">
							Подбор пациентов из листа ожидания в освободившееся окно
						</h2>
						<p className="text-xs text-[var(--text-muted,#64748b)] mt-0.5">
							{activeSlot?.doctorName} • {activeSlot?.chairName} • {activeSlot?.freedBecause}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsDrawerOpen(true)}
							className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-hover,#0f766e)] shadow-sm transition-colors cursor-pointer"
						>
							Открыть лист
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f1f5f9)] cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>

				<WaitlistMatchesBlock
					appointmentId="demo-freed-slot-1"
					initialSlot={activeSlot}
					compact={false}
					onOpenWaitlist={(slot) => {
						setActiveSlot(slot || DEMO_TARGET_SLOT);
						setIsDrawerOpen(true);
					}}
				/>

				<WaitlistDrawer
					isOpen={isDrawerOpen}
					onClose={() => setIsDrawerOpen(false)}
					targetSlot={activeSlot}
				/>
			</div>
		</div>
	);
};

export default DirectWaitlistMatchesLauncher;