/**
 * DirectTreatmentPlanLauncher.tsx — Автономный лаунчер студии планов лечения (SSOT).
 * Мандаты 8b, 8aq: Монтирование в живой UI (AppShell, SpecializedClinicalLaunchers, Sweet Spot 60–80 строк).
 * Реагирует на хэши #treatment-plans, #plans, #plan-presenter, ?plans=1 и событие "dente:open-treatment-plan".
 */

import React, { useState, useEffect, useCallback } from "react";
import { TreatmentPlanStudioModal } from "./TreatmentPlanStudioModal";
import { LiveTreatmentPlanPresenterLauncher } from "../appLayout/modalsContainerModules/standalone/LiveTreatmentPlanPresenterLauncher";

export interface DirectTreatmentPlanLauncherProps {
	readonly className?: string;
}

export const DirectTreatmentPlanLauncher: React.FC<DirectTreatmentPlanLauncherProps> = () => {
	const checkUrlTrigger = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		return (
			hash.includes("presenter") ||
			hash.includes("treatment-plans") ||
			hash.includes("treatment-plan") ||
			hash.includes("treatment-studio") ||
			hash.includes("plan-presenter") ||
			hash.includes("#plans") ||
			hash.includes("#estimates") ||
			search.includes("plans=1") ||
			search.includes("plan=1") ||
			search.includes("treatment-plan") ||
			search.includes("treatment_plan")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlTrigger);
	const [patientName, setPatientName] = useState<string>("Смирнова Екатерина Васильевна");
	const [doctorFullName, setDoctorFullName] = useState<string>("Д-р Орлов А.В. (Главный врач)");

	useEffect(() => {
		const handleHashOrPop = () => {
			if (checkUrlTrigger()) setIsOpen(true);
		};

		const handleCustomOpen = (evt: Event) => {
			const d = (evt as CustomEvent<{ patientName?: string; doctorFullName?: string }>).detail;
			if (d?.patientName) setPatientName(d.patientName);
			if (d?.doctorFullName) setDoctorFullName(d.doctorFullName);
			setIsOpen(true);
		};

		window.addEventListener("hashchange", handleHashOrPop);
		window.addEventListener("popstate", handleHashOrPop);
		window.addEventListener("dente:open-treatment-plan", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashOrPop);
			window.removeEventListener("popstate", handleHashOrPop);
			window.removeEventListener("dente:open-treatment-plan", handleCustomOpen);
		};
	}, [checkUrlTrigger]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("plans");
			url.searchParams.delete("plan");
			url.searchParams.delete("treatment-plan");
			const cleanHash = window.location.hash.replace(/#(treatment-plans?|treatment-studio|plan-presenter|plans|estimates)/gi, "");
			window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	const hash = typeof window !== "undefined" ? window.location.hash.toLowerCase() : "";
	const search = typeof window !== "undefined" ? window.location.search.toLowerCase() : "";
	const isPresenterMode = hash.includes("presenter") || search.includes("presenter=1");

	if (isPresenterMode) {
		return (
			<LiveTreatmentPlanPresenterLauncher
				isOpen={isOpen}
				onClose={handleClose}
				patientId="pat-walkin"
				planId="plan-active"
			/>
		);
	}

	return (
		<TreatmentPlanStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientName={patientName}
			doctorFullName={doctorFullName}
			initialSelectedTierId="optimum"
		/>
	);
};

export default DirectTreatmentPlanLauncher;
