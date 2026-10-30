/**
 * apps/web/src/components/lab/DirectDentalLabLauncher.tsx
 *
 * DENTE Dental CRM — Standalone Dental Laboratory Studio Launcher.
 * Deep Link Mount: #lab, #dental-lab, #ztl, #lab-studio, ?standalone=dental_lab, ?lab=1.
 * Mounts in AppShell & StandaloneLaunchers (Mandates 8b <= 150 lines, 8aq, 8am).
 */

import React, { useState, useEffect, useCallback } from "react";
import { DentalLabStudioModal } from "./DentalLabStudioModal";
import type { DentalLabOrderEntry } from "./dentalLabCatalogData";

export function checkIsLabActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = (window.location.hash || "").toLowerCase();
	return (
		s.includes("standalone=dental_lab") ||
		s.includes("standalone=lab_order") ||
		s.includes("standalone=lab_hub") ||
		s.includes("tab=lab") ||
		s.includes("lab=1") ||
		s.includes("dental-lab=1") ||
		h === "#lab" ||
		h === "#ztl" ||
		h === "#dental-lab" ||
		h === "#lab-studio" ||
		h === "#lab-orders" ||
		h === "#lab-hub" ||
		h.includes("dental-lab") ||
		h.includes("dental_lab") ||
		h.includes("lab_order")
	);
}

export const DirectDentalLabLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(() => checkIsLabActive());
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [initialToothFdi, setInitialToothFdi] = useState<string>("16");

	const [theme, setTheme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (search.includes("dark") || hash.includes("dark")) return "dark";
			if (document.documentElement.classList.contains("dark")) return "dark";
		}
		return "light";
	});

	const handleOpen = useCallback((e?: Event) => {
		const detail = (e as CustomEvent)?.detail;
		if (detail?.toothFdi || detail?.toothNumber) {
			setInitialToothFdi(String(detail.toothFdi || detail.toothNumber));
		}
		setIsActive(true);
		setIsOpen(true);
	}, []);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsLabActive();
			setIsActive(active);
			if (active) setIsOpen(true);
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-lab", handleOpen);
		window.addEventListener("dente:open-dental-lab", handleOpen);
		window.addEventListener("dente:open-lab-order", handleOpen);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-lab", handleOpen);
			window.removeEventListener("dente:open-dental-lab", handleOpen);
			window.removeEventListener("dente:open-lab-order", handleOpen);
		};
	}, [handleOpen]);

	useEffect(() => {
		if (typeof document !== "undefined") {
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.documentElement.setAttribute("data-theme", "dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.documentElement.setAttribute("data-theme", "light");
			}
		}
	}, [theme]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			const h = (window.location.hash || "").toLowerCase();
			if (h.includes("lab") || h.includes("ztl") || h.includes("dental")) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	const handleOrderCreated = useCallback((_order: DentalLabOrderEntry) => {
		// Заказ успешно отправлен в лабораторию
	}, []);

	if (!isActive) return null;

	return (
		<main
			data-testid="direct-dental-lab-launcher-root"
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-2 sm:p-4 relative"
		>
			{/* Переключатель темы для автономных стендовых скриншотов */}
			<div className="fixed top-3 right-3 z-40 hidden sm:flex items-center gap-2 bg-[var(--paper-strong)] border border-[var(--line)] px-3 py-1.5 rounded-xl shadow-xs">
				<span className="text-xs text-[var(--ink-muted)]">Тема:</span>
				<button
					type="button"
					data-testid="toggle-lab-theme-button"
					onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
					className="text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
				>
					{theme === "dark" ? "🌙 Dark" : "☀️ Light"}
				</button>
			</div>

			<DentalLabStudioModal
				isOpen={isOpen}
				onClose={handleClose}
				initialToothFdi={initialToothFdi}
				patientName="Ковалев Дмитрий Сергеевич (42 года)"
				doctorName="Д-р Смирнова Е. В. (Ортопед)"
				onOrderCreated={handleOrderCreated}
			/>
		</main>
	);
};

export const DirectDentalLabOrderLauncher = DirectDentalLabLauncher;
export default DirectDentalLabLauncher;
