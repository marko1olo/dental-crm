/**
 * DirectDentalLabOrderLauncher.tsx — Прямой автономный лаунчер наряда в лабораторию (Мандаты 8b, 8aq, <= 120 строк).
 * Монтируется в корневой AppShell, слушает хэш #dental_lab / #lab_order и событие dente:open-lab-order.
 */
import React, { useEffect, useState } from "react";
import { DentalLabOrderModal } from "./DentalLabOrderModal";

function checkIsLabActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	if (s.includes("dental_lab_hub") || h.includes("dental_lab_hub") || s.includes("lab_hub") || h.includes("lab_hub")) {
		return false;
	}
	return (
		s.includes("standalone=dental_lab") ||
		s.includes("standalone=lab_order") ||
		h.includes("dental_lab") ||
		h.includes("lab_order") ||
		h === "#lab"
	);
}

export const DirectDentalLabOrderLauncher: React.FC = () => {
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
		window.addEventListener("dente:open-lab-order", handleOpen);
		window.addEventListener("dente:open-dental-lab", handleOpen);
		window.addEventListener("dente-open-lab-order-modal", handleOpen);

		const handleState = () => {
			if (checkIsLabActive()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-lab-order", handleOpen);
			window.removeEventListener("dente:open-dental-lab", handleOpen);
			window.removeEventListener("dente-open-lab-order-modal", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<DentalLabOrderModal
			isOpen={isOpen}
			onClose={() => {
				setIsOpen(false);
				if (window.location.hash.includes("dental_lab") || window.location.hash.includes("lab_order")) {
					window.location.hash = "";
				}
			}}
			patientName="Ковалев Дмитрий Сергеевич"
			doctorName="Д-р Смирнова Е. В. (Ортопед)"
			initialToothFdi={initialToothFdi}
		/>
	);
};
