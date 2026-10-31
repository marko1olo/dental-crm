/**
 * DirectPerioLauncher.tsx — Автономный лаунчер кабинета пародонтологии и экспресс-скрининга PSR
 * Смонтирован в AppShell.tsx и StandaloneLaunchers.tsx, слушает #perio, #psr, #periodontics, ?perio=1.
 * Норматив размера: 60–100 строк (Мандаты 8b, 8aq).
 */

import React, { useEffect, useState, useCallback } from "react";
import { PerioStudioModal } from "./PerioStudioModal";

function checkIsPerioActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("perio") ||
		s.includes("psr") ||
		s.includes("periodontics") ||
		h.includes("perio") ||
		h.includes("psr") ||
		h.includes("periodontics")
	);
}

export const DirectPerioLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsPerioActive());
	const [patientId, setPatientId] = useState<string>("demo_perio_patient");
	const [patientName, setPatientName] = useState<string>("Смирнова Анна Сергеевна (Пародонтология)");

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.patientId) setPatientId(String(detail.patientId));
			if (detail?.patientName) setPatientName(String(detail.patientName));
			setIsOpen(true);
		};

		window.addEventListener("dente:open-perio", handleOpen);
		window.addEventListener("dente:open-psr", handleOpen);
		window.addEventListener("dente-open-perio-modal", handleOpen);

		const handleState = () => {
			if (checkIsPerioActive()) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-perio", handleOpen);
			window.removeEventListener("dente:open-psr", handleOpen);
			window.removeEventListener("dente-open-perio-modal", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined" && checkIsPerioActive()) {
			history.replaceState(null, "", window.location.pathname);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<PerioStudioModal
			isOpen={isOpen}
			isModal={true}
			onClose={handleClose}
			patientId={patientId}
			patientName={patientName}
		/>
	);
};

export default DirectPerioLauncher;
