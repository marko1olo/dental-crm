/**
 * DirectSurgeryLauncher.tsx — Прямой автономный лаунчер хирургического хаба и паспортов имплантатов (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэши #surgery, #implants, #implant-passport и события dente:open-surgery.
 */

import React, { useEffect, useState, useCallback } from "react";
import { ChairsideSurgeryHubModal } from "./ChairsideSurgeryHubModal";
import type { SurgeryScenarioType } from "./surgeryCatalogData";

const DEMO_SURGERY_PATIENT = {
	id: "pat-surgery-canonical",
	fullName: "Иванов Иван Иванович",
	doctorName: "Д-р Воронов А. В.",
};

export const DirectSurgeryLauncher: React.FC = () => {
	const checkUrlMatches = () => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("surgery") || s.includes("implants") || s.includes("implant-passport") ||
			h.includes("surgery") || h.includes("implants") || h.includes("implant-passport")
		);
	};

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatches);
	const [initialScenario, setInitialScenario] = useState<SurgeryScenarioType>("implant");
	const [initialTooth, setInitialTooth] = useState<number>(46);

	const handleOpenEvent = useCallback((e: Event) => {
		const detail = (e as CustomEvent<{ scenario?: SurgeryScenarioType; toothFdi?: number }>).detail;
		if (detail?.scenario) setInitialScenario(detail.scenario);
		if (detail?.toothFdi) setInitialTooth(detail.toothFdi);
		setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-surgery", handleOpenEvent);
		window.addEventListener("dente-open-surgery", handleOpenEvent);
		window.addEventListener("dente:open-implant-passport", handleOpenEvent);

		const handleHash = () => {
			if (checkUrlMatches()) {
				const h = window.location.hash || "";
				if (h.includes("implant")) setInitialScenario("implant");
				else if (h.includes("extraction")) setInitialScenario("extraction");
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);
		return () => {
			window.removeEventListener("dente:open-surgery", handleOpenEvent);
			window.removeEventListener("dente-open-surgery", handleOpenEvent);
			window.removeEventListener("dente:open-implant-passport", handleOpenEvent);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, [handleOpenEvent]);

	if (!isOpen) return null;

	return (
		<ChairsideSurgeryHubModal
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			patientName={DEMO_SURGERY_PATIENT.fullName}
			patientId={DEMO_SURGERY_PATIENT.id}
			doctorName={DEMO_SURGERY_PATIENT.doctorName}
			initialTooth={initialTooth}
			initialScenario={initialScenario}
			inventoryOverdraftActive={true}
		/>
	);
};

export default DirectSurgeryLauncher;
