/**
 * apps/web/src/components/leads/DirectLeadsLauncher.tsx
 *
 * Канонический автономный лончер воронки первичных обращений (Leads & CRM Funnel).
 * Мандаты 8b (50–70 строк), 8aq (Монтирование в живой UI), 8e (Автономия врача).
 * Поддерживает: #leads, #crm-leads, #kanban, ?leads=1, событие 'dente:open-leads'.
 */

import React, { useState, useEffect, useCallback } from "react";
import { LeadsStudioModal } from "./LeadsStudioModal";

export function evaluateLeadsDeepLink(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	return (
		h.includes("leads") || h.includes("crm-leads") || h.includes("kanban") ||
		s.includes("leads=1") || s.includes("crm_leads=1") || s.includes("standalone=leads")
	);
}

export const DirectLeadsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState(() => evaluateLeadsDeepLink());

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("leads");
			url.searchParams.delete("crm_leads");
			if (window.location.hash.includes("leads") || window.location.hash.includes("kanban")) {
				window.history.replaceState(null, "", url.pathname + url.search);
			}
		}
	}, []);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleRoute = () => { if (evaluateLeadsDeepLink()) setIsOpen(true); };

		window.addEventListener("dente:open-leads", handleOpen);
		window.addEventListener("hashchange", handleRoute);
		window.addEventListener("popstate", handleRoute);
		return () => {
			window.removeEventListener("dente:open-leads", handleOpen);
			window.removeEventListener("hashchange", handleRoute);
			window.removeEventListener("popstate", handleRoute);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<LeadsStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			onOpenPatientCard={(patientId) => {
				window.dispatchEvent(new CustomEvent("dente:open-patient-card", { detail: { patientId } }));
			}}
		/>
	);
};

export default DirectLeadsLauncher;
