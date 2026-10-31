/**
 * apps/web/src/components/lab/DirectLabLauncher.tsx
 * DENTE Dental CRM — Автономный лаунчер зуботехнической студии (SSOT).
 * Роутинг: #lab, #dental-lab, #ztl, #lab-studio, ?lab=1, ?standalone=dental_lab.
 * Смонтирован в StandaloneLaunchers.tsx и AppShell.tsx (Мандаты 8b: 70–90 строк, 8aq, 8am).
 */
import React, { useState, useEffect, useCallback } from "react";
import { LabStudioModal } from "./LabStudioModal";
import type { DentalLabOrderEntry } from "./labCatalogData";

export function checkIsLabActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "", h = (window.location.hash || "").toLowerCase();
	return (
		s.includes("standalone=dental_lab") || s.includes("standalone=lab_order") || s.includes("standalone=lab_hub") ||
		s.includes("tab=lab") || s.includes("lab=1") || s.includes("dental-lab=1") ||
		h === "#lab" || h === "#ztl" || h === "#dental-lab" || h === "#lab-studio" || h === "#lab-orders" ||
		h.includes("dental-lab") || h.includes("dental_lab") || h.includes("lab_order")
	);
}

export const DirectLabLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(() => checkIsLabActive());
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [initialToothFdi, setInitialToothFdi] = useState<string>("16");

	const handleOpen = useCallback((e?: Event) => {
		const detail = (e as CustomEvent)?.detail;
		if (detail?.toothFdi || detail?.toothNumber) setInitialToothFdi(String(detail.toothFdi || detail.toothNumber));
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

	if (!isActive) return null;

	return (
		<main data-testid="direct-dental-lab-launcher-root" className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-2 sm:p-4 relative">
			<LabStudioModal
				isOpen={isOpen} onClose={handleClose} initialToothFdi={initialToothFdi}
				patientName="Ковалев Дмитрий Сергеевич (42 года)" doctorName="Д-р Смирнова Е. В. (Ортопед)"
				onOrderCreated={(_ord: DentalLabOrderEntry) => {}}
			/>
		</main>
	);
};

export const DirectDentalLabLauncher = DirectLabLauncher;
export const DirectDentalLabOrderLauncher = DirectLabLauncher;
export default DirectLabLauncher;
