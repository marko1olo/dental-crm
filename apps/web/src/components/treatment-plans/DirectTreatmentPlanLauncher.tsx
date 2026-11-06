/**
 * DirectTreatmentPlanLauncher.tsx — Автономный лаунчер студии планов лечения (SSOT).
 * Мандаты 8b, 8aq: Монтирование в живой UI (AppShell, SpecializedClinicalLaunchers, Sweet Spot 60–80 строк).
 * Реагирует на хэши #treatment-plans, #plans, #plan-presenter, ?plans=1 и событие "dente:open-treatment-plan".
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TreatmentPlanStudioModal } from "./TreatmentPlanStudioModal";
import { LiveTreatmentPlanPresenterLauncher } from "../appLayout/modalsContainerModules/standalone/LiveTreatmentPlanPresenterLauncher";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";

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
	const [customPatientName, setCustomPatientName] = useState<string | null>(null);
	const [customDoctorFullName, setCustomDoctorFullName] = useState<string | null>(null);
	const [customPatientId, setCustomPatientId] = useState<string | null>(null);

	// Реактивная гидратация из zustand сторов (usePatientStore, useAppStore)
	const storePatientId = usePatientStore((s) => s.selectedPatientId);
	const storePatientCore = usePatientStore((s) => s.patientCoreDraft);
	const dashboard = useAppStore((s) => s.dashboard);
	const storeActiveDoctorName = useAppStore((s) => s.activeDoctorName);

	const resolvedPatientId = customPatientId || storePatientId || dashboard?.activeVisit?.patientId || "pat-walkin";

	const resolvedPatientName = useMemo(() => {
		if (customPatientName?.trim()) return customPatientName.trim();
		if (storePatientCore?.fullName?.trim()) return storePatientCore.fullName.trim();
		const found = dashboard?.patients?.find((p) => p.id === resolvedPatientId);
		if (found?.fullName?.trim()) return found.fullName.trim();
		if (dashboard?.activeVisit?.patientName?.trim()) return dashboard.activeVisit.patientName.trim();
		return "Пациент первичного приёма";
	}, [customPatientName, storePatientCore?.fullName, dashboard?.patients, dashboard?.activeVisit?.patientName, resolvedPatientId]);

	const resolvedDoctorFullName = useMemo(() => {
		if (customDoctorFullName?.trim()) return customDoctorFullName.trim();
		if (storeActiveDoctorName?.trim()) return storeActiveDoctorName.trim();
		const found = dashboard?.doctors?.find((d) => d.name === storeActiveDoctorName || d.id === dashboard?.activeVisit?.doctorId);
		if (found?.name?.trim()) return found.name.trim();
		if (dashboard?.activeVisit?.doctorName?.trim()) return dashboard.activeVisit.doctorName.trim();
		return "Лечащий врач";
	}, [customDoctorFullName, storeActiveDoctorName, dashboard?.doctors, dashboard?.activeVisit?.doctorId, dashboard?.activeVisit?.doctorName]);

	useEffect(() => {
		const handleHashOrPop = () => {
			if (checkUrlTrigger()) setIsOpen(true);
		};

		const handleCustomOpen = (evt: Event) => {
			const d = (evt as CustomEvent<{ patientName?: string; doctorFullName?: string; patientId?: string }>).detail;
			if (d?.patientName) setCustomPatientName(d.patientName);
			if (d?.doctorFullName) setCustomDoctorFullName(d.doctorFullName);
			if (d?.patientId) setCustomPatientId(d.patientId);
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
				patientId={resolvedPatientId}
				planId="plan-active"
			/>
		);
	}

	return (
		<TreatmentPlanStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientId={resolvedPatientId}
			patientName={resolvedPatientName}
			doctorFullName={resolvedDoctorFullName}
			initialSelectedTierId="optimum"
		/>
	);
};

export default DirectTreatmentPlanLauncher;
