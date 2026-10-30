/**
 * DirectTreatmentPlanLauncher.tsx — Автономный монтируемый лаунчер планов лечения и смет (SSOT).
 * Мандаты 8b, 8aq: Монтирование в живой UI (AppShell.tsx), Sweet Spot (60–90 строк).
 * Реагирует на хэши #plans, #treatment-plans, #treatment-plan, #estimates
 * и CustomEvent("dente:open-treatment-plan").
 */

import React, { useState, useEffect, useCallback } from "react";
import { TreatmentPlanPresenterModal } from "./TreatmentPlanPresenterModal";
import { buildCanonical3TierPlans } from "./treatmentPlansCatalogData";

export interface DirectTreatmentPlanLauncherProps {
	readonly className?: string;
}

export const DirectTreatmentPlanLauncher: React.FC<DirectTreatmentPlanLauncherProps> = () => {
	const checkUrlTrigger = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		return (
			hash.includes("treatment-plan") ||
			hash.includes("treatment-plans") ||
			hash.includes("#plans") ||
			hash.includes("#estimates") ||
			search.includes("treatment-plan") ||
			search.includes("plan=1") ||
			search.includes("estimates=1")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlTrigger);
	const [patientName, setPatientName] = useState<string>("Смирнова Екатерина Васильевна");
	const [doctorFullName, setDoctorFullName] = useState<string>("Д-р Орлов А.В. (Главный врач)");

	useEffect(() => {
		const handleHashOrPop = () => {
			if (checkUrlTrigger()) {
				setIsOpen(true);
			}
		};

		const handleCustomOpen = (evt: Event) => {
			const customEvt = evt as CustomEvent<{ patientName?: string; doctorFullName?: string }>;
			if (customEvt.detail?.patientName) {
				setPatientName(customEvt.detail.patientName);
			}
			if (customEvt.detail?.doctorFullName) {
				setDoctorFullName(customEvt.detail.doctorFullName);
			}
			setIsOpen(true);
		};

		window.addEventListener("hashchange", handleHashOrPop);
		window.addEventListener("popstate", handleHashOrPop);
		window.addEventListener("dente:open-treatment-plan", handleCustomOpen);
		window.addEventListener("dente-open-treatment-plan", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashOrPop);
			window.removeEventListener("popstate", handleHashOrPop);
			window.removeEventListener("dente:open-treatment-plan", handleCustomOpen);
			window.removeEventListener("dente-open-treatment-plan", handleCustomOpen);
		};
	}, [checkUrlTrigger]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("plan");
			url.searchParams.delete("plans");
			url.searchParams.delete("treatment-plan");
			url.searchParams.delete("estimates");
			const cleanHash = window.location.hash.replace(/#(treatment-plans?|plans|estimates)/gi, "");
			window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	const tiers = buildCanonical3TierPlans();

	return (
		<TreatmentPlanPresenterModal
			isOpen={isOpen}
			onClose={handleClose}
			patientName={patientName}
			doctorFullName={doctorFullName}
			tiers={tiers}
			initialSelectedTierId="optimum"
		/>
	);
};

export default DirectTreatmentPlanLauncher;
