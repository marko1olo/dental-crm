/**
 * DirectDentalLabLauncher.tsx — Автономный лаунчер кабинета ЗТЛ в DENTE CRM.
 * Монтируется в корень AppShell.tsx, слушает хэши #lab / #dental-lab и события dente:open-dental-lab.
 * Мандаты 8b (60–80 строк), 8aq (Монтирование в живой UI), 8e (Автономия врача).
 */
import React, { useState, useEffect } from "react";
import { DentalLabHubModal } from "./DentalLabHubModal";

function checkIsLabActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("standalone=dental_lab") || s.includes("standalone=lab_order") || s.includes("standalone=lab_hub") ||
		h.includes("dental-lab") || h.includes("dental_lab") || h.includes("lab_order") || h === "#lab" || h === "#lab-hub"
	);
}

export const DirectDentalLabLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsLabActive());
	const [initialToothFdi, setInitialToothFdi] = useState<string>("16");

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.toothFdi || detail?.toothNumber) {
				setInitialToothFdi(String(detail.toothFdi || detail.toothNumber));
			}
			setIsOpen(true);
		};

		window.addEventListener("dente:open-dental-lab", handleOpen);
		window.addEventListener("dente:open-lab-order", handleOpen);
		window.addEventListener("dente-open-lab-order-modal", handleOpen);
		window.addEventListener("dente-open-lab-hub", handleOpen);

		const handleState = () => {
			if (checkIsLabActive()) setIsOpen(true);
		};

		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-dental-lab", handleOpen);
			window.removeEventListener("dente:open-lab-order", handleOpen);
			window.removeEventListener("dente-open-lab-order-modal", handleOpen);
			window.removeEventListener("dente-open-lab-hub", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<DentalLabHubModal
			isOpen={isOpen}
			onClose={() => {
				setIsOpen(false);
				if (typeof window !== "undefined" && window.location.hash) {
					const h = window.location.hash;
					if (h.includes("lab") || h.includes("dental")) window.location.hash = "";
				}
			}}
			currentPatientName="Ковалев Дмитрий Сергеевич"
			currentDoctorName="Д-р Смирнова Е. В. (Ортопед)"
			currentToothNumber={initialToothFdi}
		/>
	);
};

export const DirectDentalLabOrderLauncher = DirectDentalLabLauncher;
