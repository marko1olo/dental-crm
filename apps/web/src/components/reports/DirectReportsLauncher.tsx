/**
 * DENTE Dental CRM — Direct Manager Reports Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 */

import React, { Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ManagerReportsPanel } from "./ManagerReportsPanel";

export const DirectReportsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("reports") ||
			h.includes("reports") ||
			s.includes("manager-reports") ||
			h.includes("manager-reports")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-reports", handleOpen);
		window.addEventListener("dente:open-reports", handleOpen);
		return () => {
			window.removeEventListener("dente-open-reports", handleOpen);
			window.removeEventListener("dente:open-reports", handleOpen);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("manager-reports");
			url.searchParams.delete("reports");
			const cleanHash = window.location.hash.replace(
				/#manager-reports|#reports=direct/g,
				"",
			);
			const newUrl =
				url.pathname +
				(url.search ? url.search : "") +
				cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<div
			id="direct-manager-reports-overlay"
			className="fixed inset-0 z-[9999] bg-[var(--canvas)]/95 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label="Отчёты управляющего клиникой"
		>
			<div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)]" />
						<span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
							Аналитический пульт руководителя
						</span>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть отчёты"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1">
					<Suspense
						fallback={
							<div className="p-8 text-center text-[var(--muted)]">
								Загрузка отчётов управляющего...
							</div>
						}
					>
						<ManagerReportsPanel />
					</Suspense>
				</div>
			</div>
		</div>
	);
};
