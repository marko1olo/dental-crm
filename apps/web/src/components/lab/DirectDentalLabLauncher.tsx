/**
 * DirectDentalLabLauncher.tsx — Автономный лаунчер хаба зуботехнической лаборатории в DENTE CRM.
 * 
 * Монтируется в корень AppShell.tsx (Мандат 8aq).
 * Реагирует на URL-хэши: #lab, #ztl, #lab-orders, #lab-hub, #dental-lab.
 * Реагирует на CustomEvents:
 * - "dente:open-lab" (Каноническое событие согласно Мандату 8aq)
 * - "dente:open-dental-lab"
 * - "dente:open-lab-order"
 * - "dente-open-lab-hub"
 * 
 * Соответствует Высшей Конституции THE HAMMER и Мандатам 8b (60–80 строк), 8aq, 8e.
 */

import React, { useState, useEffect, useCallback } from "react";
import { DentalLabOrdersHubModal } from "./DentalLabOrdersHubModal";

export function checkIsLabActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = (window.location.hash || "").toLowerCase();
	return (
		s.includes("standalone=dental_lab") ||
		s.includes("standalone=lab_order") ||
		s.includes("standalone=lab_hub") ||
		s.includes("tab=lab") ||
		h === "#lab" ||
		h === "#ztl" ||
		h === "#lab-orders" ||
		h === "#lab-hub" ||
		h.includes("dental-lab") ||
		h.includes("dental_lab") ||
		h.includes("lab_order")
	);
}

export const DirectDentalLabLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsLabActive());
	const [initialToothFdi, setInitialToothFdi] = useState<string>("16");
	const [initialTab, setInitialTab] = useState<"orders" | "create" | "print">("orders");

	const handleOpen = useCallback((e?: Event) => {
		const detail = (e as CustomEvent)?.detail;
		if (detail?.toothFdi || detail?.toothNumber) {
			setInitialToothFdi(String(detail.toothFdi || detail.toothNumber));
		}
		if (detail?.tab === "create" || detail?.mode === "create") {
			setInitialTab("create");
		} else {
			setInitialTab("orders");
		}
		setIsOpen(true);
	}, []);

	useEffect(() => {
		// Канонические слушатели событий (Мандат 8aq)
		window.addEventListener("dente:open-lab", handleOpen);
		window.addEventListener("dente:open-dental-lab", handleOpen);
		window.addEventListener("dente:open-lab-order", handleOpen);
		window.addEventListener("dente-open-lab-hub", handleOpen);
		window.addEventListener("dente-open-lab-order-modal", handleOpen);

		const handleState = () => {
			if (checkIsLabActive()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-lab", handleOpen);
			window.removeEventListener("dente:open-dental-lab", handleOpen);
			window.removeEventListener("dente:open-lab-order", handleOpen);
			window.removeEventListener("dente-open-lab-hub", handleOpen);
			window.removeEventListener("dente-open-lab-order-modal", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, [handleOpen]);

	if (!isOpen) return null;

	return (
		<DentalLabOrdersHubModal
			isOpen={isOpen}
			initialTab={initialTab}
			onClose={() => {
				setIsOpen(false);
				if (typeof window !== "undefined" && window.location.hash) {
					const h = window.location.hash.toLowerCase();
					if (h.includes("lab") || h.includes("ztl") || h.includes("dental")) {
						window.location.hash = "";
					}
				}
			}}
			currentPatientName="Ковалев Дмитрий Сергеевич"
			currentDoctorName="Д-р Смирнова Е. В. (Ортопед)"
			currentToothNumber={initialToothFdi}
		/>
	);
};

export const DirectDentalLabOrderLauncher = DirectDentalLabLauncher;
