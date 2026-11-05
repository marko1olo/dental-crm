/**
 * DirectPatientStudioLauncher.tsx — Единый автономный лаунчер студии картотеки пациентов (SSOT).
 * Мандаты: 8b / 8zi (Sweet Spot: 60–80 строк), 8e (Автономия персонала), 8aq (Монтирование в живой UI).
 */

import React, { useState, useEffect, useCallback } from "react";
import { PatientStudioModal } from "./PatientStudioModal";
import { clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";

export const DirectPatientStudioLauncher: React.FC = () => {
	const checkUrlTrigger = useCallback((): { open: boolean; mode?: "view" | "create" } => {
		if (typeof window === "undefined") return { open: false };
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		const isCreate = hash.includes("patient-create") || hash.includes("express-patient") || search.includes("patient_create") || search.includes("express_patient");
		const isOpen = isCreate || hash.includes("patients") || hash.includes("patient-studio") || hash.includes("patient_studio") || search.includes("patients=1") || search.includes("patient_studio=1") || search.includes("express_patient=1");
		return { open: isOpen, mode: isCreate ? "create" : "view" };
	}, []);

	const [triggerState, setTriggerState] = useState(checkUrlTrigger);

	useEffect(() => {
		const handleHashOrPop = () => {
			const res = checkUrlTrigger();
			if (res.open) setTriggerState(res);
		};
		const handleCustomOpen = (e?: Event) => {
			const customDetail = (e as CustomEvent)?.detail;
			setTriggerState({ open: true, mode: customDetail?.mode === "create" ? "create" : "view" });
		};

		window.addEventListener("hashchange", handleHashOrPop);
		window.addEventListener("popstate", handleHashOrPop);
		window.addEventListener("dente:open-patients", handleCustomOpen);
		window.addEventListener("dente:open-patient-studio", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashOrPop);
			window.removeEventListener("popstate", handleHashOrPop);
			window.removeEventListener("dente:open-patients", handleCustomOpen);
			window.removeEventListener("dente:open-patient-studio", handleCustomOpen);
		};
	}, [checkUrlTrigger]);

	const handleClose = useCallback(() => {
		setTriggerState({ open: false });
		clearUrlTokens(
			["patients", "patient_studio", "patient-studio", "express_patient"],
			["#patients", "#patient-studio", "#patient_studio", "#express-patient"],
		);
	}, []);

	if (!triggerState.open) return null;

	return (
		<div data-testid="patient-studio-launcher-root">
			<PatientStudioModal isOpen={true} onClose={handleClose} initialMode={triggerState.mode || "view"} />
		</div>
	);
};

export default DirectPatientStudioLauncher;
