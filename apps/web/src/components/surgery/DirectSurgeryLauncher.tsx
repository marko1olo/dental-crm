/**
 * DirectSurgeryLauncher.tsx — Прямой автономный лаунчер хирургического хаба (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэш #surgery и событие dente:open-surgery.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ChairsideSurgeryHubModal, type SurgeryHubTab } from "./ChairsideSurgeryHubModal";
import type { SurgeryScenarioType } from "./surgeryCatalogData";
import { useAppStore } from "../../store/appStore";

export const DirectSurgeryLauncher: React.FC = () => {
	const checkUrlMatches = () => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("surgery") ||
			h.includes("surgery") ||
			s.includes("implant") ||
			h.includes("implant") ||
			h.includes("extraction") ||
			s.includes("extraction") ||
			h.includes("resection") ||
			s.includes("resection") ||
			h.includes("sinus") ||
			s.includes("sinus")
		);
	};

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatches);
	const [initialScenario, setInitialScenario] = useState<SurgeryScenarioType>(() => {
		if (typeof window !== "undefined") {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			if (h.includes("extraction") || s.includes("extraction")) return "extraction";
			if (h.includes("resection") || s.includes("resection")) return "resection_periostotomy";
			if (h.includes("sinus") || s.includes("sinus")) return "sinus_gbr";
		}
		return "implant";
	});
	const [initialTab, setInitialTab] = useState<SurgeryHubTab>(() => {
		if (typeof window !== "undefined") {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			if (h.includes("implant-passport") || s.includes("implant-passport")) return "passport";
		}
		return "protocol";
	});
	const [initialTooth, setInitialTooth] = useState<number>(46);

	const storeActivePatient = useAppStore((s) => {
		const activeId = s.activePatientId;
		return (
			s.dashboard?.patients?.find((p) => p.id === activeId) ||
			s.dashboard?.activeVisit?.patientId
				? s.dashboard?.patients?.find((p) => p.id === s.dashboard?.activeVisit?.patientId)
				: s.dashboard?.patients?.[0]
		);
	});
	const storeDoctorName = useAppStore((s) => s.activeDoctorName);

	const effectivePatient = useMemo(() => {
		if (storeActivePatient) {
			return {
				id: storeActivePatient.id,
				fullName: storeActivePatient.fullName,
				doctorName: storeDoctorName || "Врач-хирург",
			};
		}
		return {
			id: "PAT-BLANK",
			fullName: "Пациент не выбран",
			doctorName: storeDoctorName || "Врач-хирург",
		};
	}, [storeActivePatient, storeDoctorName]);

	const handleOpenEvent = useCallback((e: Event) => {
		const detail = (e as CustomEvent<{ scenario?: SurgeryScenarioType; toothFdi?: number; tab?: SurgeryHubTab }>).detail;
		if (detail?.scenario) setInitialScenario(detail.scenario);
		if (detail?.toothFdi) setInitialTooth(detail.toothFdi);
		if (detail?.tab) setInitialTab(detail.tab);
		setIsOpen(true);
	}, []);

	const handleOpenImplantPassport = useCallback((e?: Event) => {
		const detail = (e as CustomEvent<{ tooth?: number; toothFdi?: number; tab?: string }>)?.detail;
		setInitialScenario("implant");
		setInitialTab("passport");
		if (detail?.tooth || detail?.toothFdi) setInitialTooth(detail.tooth || detail.toothFdi || 46);
		setIsOpen(true);
	}, []);

	const handleOpenImplantStudio = useCallback((e?: Event) => {
		const detail = (e as CustomEvent<{ tooth?: number; toothFdi?: number; tab?: string }>)?.detail;
		setInitialScenario("implant");
		setInitialTab((detail?.tab === "passport" ? "passport" : "protocol") as SurgeryHubTab);
		if (detail?.tooth || detail?.toothFdi) setInitialTooth(detail.tooth || detail.toothFdi || 46);
		setIsOpen(true);
	}, []);

	useEffect(() => {
		window.addEventListener("dente:open-surgery", handleOpenEvent);
		window.addEventListener("dente-open-surgery", handleOpenEvent);
		window.addEventListener("dente:open-implant-passport", handleOpenImplantPassport);
		window.addEventListener("dente-open-implant-passport", handleOpenImplantPassport);
		window.addEventListener("dente:open-implant-studio", handleOpenImplantStudio);

		const handleHash = () => {
			if (checkUrlMatches()) {
				const h = window.location.hash || "";
				const s = window.location.search || "";
				if (h.includes("implant-passport") || s.includes("implant-passport")) {
					setInitialScenario("implant");
					setInitialTab("passport");
				} else if (h.includes("extraction") || s.includes("extraction")) {
					setInitialScenario("extraction");
					setInitialTab("protocol");
				} else if (h.includes("resection") || s.includes("resection")) {
					setInitialScenario("resection_periostotomy");
					setInitialTab("protocol");
				} else if (h.includes("sinus") || s.includes("sinus")) {
					setInitialScenario("sinus_gbr");
					setInitialTab("protocol");
				} else {
					setInitialScenario("implant");
					setInitialTab("protocol");
				}
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);
		return () => {
			window.removeEventListener("dente:open-surgery", handleOpenEvent);
			window.removeEventListener("dente-open-surgery", handleOpenEvent);
			window.removeEventListener("dente:open-implant-passport", handleOpenImplantPassport);
			window.removeEventListener("dente-open-implant-passport", handleOpenImplantPassport);
			window.removeEventListener("dente:open-implant-studio", handleOpenImplantStudio);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, [handleOpenEvent, handleOpenImplantPassport, handleOpenImplantStudio]);

	if (!isOpen) return null;

	return (
		<ChairsideSurgeryHubModal
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			patientName={effectivePatient.fullName}
			patientId={effectivePatient.id}
			doctorName={effectivePatient.doctorName}
			initialTooth={initialTooth}
			initialScenario={initialScenario}
			initialTab={initialTab}
			inventoryOverdraftActive={true}
		/>
	);
};

export const SurgeryStudioLauncher = DirectSurgeryLauncher;

export default DirectSurgeryLauncher;
