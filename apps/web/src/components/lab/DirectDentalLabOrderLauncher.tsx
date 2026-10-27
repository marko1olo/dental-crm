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
	return (
		s.includes("standalone=dental_lab") ||
		s.includes("standalone=lab_order") ||
		s.includes("dental_lab") ||
		s.includes("lab_order") ||
		h.includes("dental_lab") ||
		h.includes("lab_order") ||
		h === "#lab"
	);
}

export const DirectDentalLabOrderLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsLabActive());

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-lab-order", handleOpen);
		window.addEventListener("dente:open-dental-lab", handleOpen);

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
			initialToothFdi="16"
		/>
	);
};
