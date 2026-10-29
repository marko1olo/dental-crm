/**
 * DirectPatientCardLauncher.tsx — Прямой лаунчер комплексной Карточки пациента (PatientCardModal SSOT).
 * Мандаты: 8b (Sweet Spot 50–80 строк), 8e (Автономия врача), 8aq (Монтирование в живой UI), 8ap (Чистый доменный язык).
 * Слушает #patient-card, ?patient_card=1, ?patient-card=1 и кастомное событие 'dente:open-patient-card'.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	PatientCardModal,
	DEMO_SHOWCASE_MODAL_PATIENT,
	DEMO_SHOWCASE_MODAL_SAFETY,
} from "./PatientCardModal";
import { clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";

export const DirectPatientCardLauncher: React.FC = () => {
	const checkUrlTrigger = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		return (
			hash.includes("patient-card") ||
			hash.includes("patient_card") ||
			search.includes("patient-card") ||
			search.includes("patient_card")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlTrigger);

	useEffect(() => {
		const handleHashOrPop = () => {
			if (checkUrlTrigger()) {
				setIsOpen(true);
			}
		};

		const handleCustomOpen = () => setIsOpen(true);

		window.addEventListener("hashchange", handleHashOrPop);
		window.addEventListener("popstate", handleHashOrPop);
		window.addEventListener("dente:open-patient-card", handleCustomOpen);
		window.addEventListener("dente-open-patient-card", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashOrPop);
			window.removeEventListener("popstate", handleHashOrPop);
			window.removeEventListener("dente:open-patient-card", handleCustomOpen);
			window.removeEventListener("dente-open-patient-card", handleCustomOpen);
		};
	}, [checkUrlTrigger]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		clearUrlTokens(["patient_card", "patient-card"], ["#patient-card", "#patient_card"]);
	}, []);

	if (!isOpen) return null;

	return (
		<div data-testid="patient-card-standalone-root">
			<PatientCardModal
				isOpen={true}
				onClose={handleClose}
				patient={DEMO_SHOWCASE_MODAL_PATIENT}
				safetyProfile={DEMO_SHOWCASE_MODAL_SAFETY}
			/>
		</div>
	);
};

export default DirectPatientCardLauncher;
