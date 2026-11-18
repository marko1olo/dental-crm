/**
 * DENTE Dental CRM — Direct Waitlist Matches Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 */
import React, { useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { WaitlistMatchesBlock } from "./waitlist/WaitlistMatchesBlock";
import { WaitlistDrawer } from "./waitlist/WaitlistDrawer";
import type { TargetSlotInfo } from "./waitlist/waitlistTypes";

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

	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		return s.includes("drawer=true") || s.includes("waitlist-drawer=true");
	});
	const [activeSlot, setActiveSlot] = useState<TargetSlotInfo | null>(() => {
		if (typeof window === "undefined") return null;
		const s = window.location.search || "";
		if (isDemoShowcaseMode() && (s.includes("target-slot") || s.includes("slot=demo"))) {
			return {
				appointmentId: "demo-freed-slot-1",
				startsAt: "2026-11-12T10:00:00.000Z",
				endsAt: "2026-11-12T11:00:00.000Z",
				doctorUserId: "demo-doctor-smirnov",
				doctorName: "Д-р Смирнов А. В.",
				chairId: "chair-1",
				chairName: "Кресло 1 (Терапия)",
				treatmentCategory: "Терапия",
				freedBecause: "Отмена приёма (окно 60 мин)",
			};
		}
		// Боевой контекст: извлекаем параметры реального слота из query string
		const params = new URLSearchParams(s);
		const apptId = params.get("appointmentId") || params.get("slotId");
		if (apptId) {
			return {
				appointmentId: apptId,
				startsAt: params.get("startsAt") || new Date().toISOString(),
				endsAt: params.get("endsAt") || new Date(Date.now() + 3600000).toISOString(),
				doctorUserId: params.get("doctorUserId") || null,
				doctorName: params.get("doctorName") || null,
				chairId: params.get("chairId") || null,
				chairName: params.get("chairName") || null,
				treatmentCategory: params.get("treatmentCategory") || undefined,
				freedBecause: params.get("freedBecause") || "Отмена приёма",
			};
		}
		return null;
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

	useEffect(() => {
		const handleOpenSlot = (e: Event) => {
			const customEvt = e as CustomEvent<TargetSlotInfo | null>;
			setActiveSlot(customEvt.detail || null);
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
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="min-w-0">
						<h2 className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight">
							Подбор пациентов из листа ожидания в освободившееся окно
						</h2>
						{activeSlot ? (
							<p className="text-xs text-[var(--text-muted,#64748b)] mt-1">
								{activeSlot.doctorName} • {activeSlot.chairName} • {activeSlot.freedBecause || "Освободившийся слот"}
							</p>
						) : (
							<p className="text-xs text-[var(--text-muted,#64748b)] mt-1">
								Слот не выбран
							</p>
						)}
					</div>
					<div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
						<button
							type="button"
							onClick={() => setIsDrawerOpen(true)}
							className="h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center shrink-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							Весь лист
						</button>
						<button
							type="button"
							onClick={handleClose}
							className="h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center shrink-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>

				{activeSlot ? (
					<WaitlistMatchesBlock
						appointmentId={activeSlot.appointmentId || "freed-slot"}
						initialSlot={activeSlot}
						compact={false}
						onOpenWaitlist={(slot) => {
							setActiveSlot(slot || null);
							setIsDrawerOpen(true);
						}}
					/>
				) : (
					<div className="p-8 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)] space-y-3">
						<p className="text-sm font-semibold text-[var(--ink)]">
							Нет выбранного освободившегося слота
						</p>
						<p className="text-xs text-[var(--text-muted)]">
							Выберите слот в расписании или откройте общий лист ожидания клиники
						</p>
						<button
							type="button"
							onClick={() => setIsDrawerOpen(true)}
							className="h-9 px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer inline-flex items-center justify-center"
						>
							Открыть лист ожидания
						</button>
					</div>
				)}

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
