/**
 * DirectPerioLauncher.tsx — Прямой автономный лаунчер кабинета пародонтологии (Мандаты 8b, 8aq, 60–80 строк).
 * Монтируется в корневой AppShell.tsx, слушает хэш #perio / #psr и события dente:open-perio.
 */

import React, { useEffect, useState, useCallback } from "react";
import { PerioWorkspaceModal } from "./PerioWorkspaceModal";

function checkIsPerioActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return s.includes("perio") || s.includes("psr") || h.includes("perio") || h.includes("psr");
}

export const DirectPerioLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsPerioActive());
	const [initialTab, setInitialTab] = useState<"psr" | "chart">(() => {
		if (typeof window === "undefined") return "psr";
		return window.location.hash.includes("chart") || window.location.search.includes("chart") ? "chart" : "psr";
	});
	const [patientId, setPatientId] = useState<string>("demo_perio_patient");
	const [patientName, setPatientName] = useState<string>("Смирнова Анна Сергеевна (Пародонтология)");

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.patientId) setPatientId(String(detail.patientId));
			if (detail?.patientName) setPatientName(String(detail.patientName));
			if (detail?.tab === "chart" || detail?.tab === "psr") setInitialTab(detail.tab);
			setIsOpen(true);
		};
		window.addEventListener("dente:open-perio", handleOpen);
		window.addEventListener("dente:open-psr", handleOpen);
		window.addEventListener("dente-open-perio-modal", handleOpen);

		const handleState = () => {
			if (checkIsPerioActive()) {
				setIsOpen(true);
				if (window.location.hash.includes("psr") || window.location.search.includes("psr")) setInitialTab("psr");
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
		if (typeof window !== "undefined" && (window.location.hash.includes("perio") || window.location.hash.includes("psr"))) {
			history.replaceState(null, "", window.location.pathname + window.location.search);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<PerioWorkspaceModal
			isOpen={isOpen}
			isModal={true}
			onClose={handleClose}
			patientId={patientId}
			patientName={patientName}
			initialTab={initialTab}
		/>
	);
};

export default DirectPerioLauncher;
