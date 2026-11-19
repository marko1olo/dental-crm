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
		const s = (window.location.search || "").toLowerCase();
		const h = (window.location.hash || "").toLowerCase();
		return (
			s.includes("surgery") ||
			h.includes("surgery") ||
			s.includes("implant") ||
			h.includes("implant") ||
			s.includes("extraction") ||
			h.includes("extraction") ||
			s.includes("resection") ||
			h.includes("resection") ||
			s.includes("sinus") ||
			h.includes("sinus")
		);
	};

	const parseUrlTooth = (): number => {
		if (typeof window === "undefined") return 46;
		const full = window.location.search + window.location.hash;
		const match = full.match(/[?&#]tooth(?:Fdi)?=(\d{2})/i);
		if (match?.[1]) {
			const num = parseInt(match[1], 10);
			if (num >= 11 && num <= 48) return num;
		}
		return 46;
	};

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlMatches);
	const [initialScenario, setInitialScenario] = useState<SurgeryScenarioType>(() => {
		if (typeof window !== "undefined") {
			const h = (window.location.hash || "").toLowerCase();
			const s = (window.location.search || "").toLowerCase();
			if (h.includes("extraction") || s.includes("extraction")) return "extraction";
			if (h.includes("resection") || s.includes("resection")) return "resection_periostotomy";
			if (h.includes("sinus") || s.includes("sinus")) return "sinus_gbr";
		}
		return "implant";
	});
	const [initialTab, setInitialTab] = useState<SurgeryHubTab>(() => {
		if (typeof window !== "undefined") {
			const h = (window.location.hash || "").toLowerCase();
			const s = (window.location.search || "").toLowerCase();
			if (
				h.includes("implant-passport") ||
				s.includes("implant-passport") ||
				h.includes("implant_passport") ||
				s.includes("implant_passport") ||
				h.includes("passport") ||
				s.includes("passport")
			) {
				return "passport";
			}
		}
		return "protocol";
	});
	const [initialTooth, setInitialTooth] = useState<number>(parseUrlTooth);

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
		const detail = (e as CustomEvent<{
			scenario?: SurgeryScenarioType;
			tooth?: number;
			toothFdi?: number;
			tab?: SurgeryHubTab;
		}>).detail;
		if (detail?.scenario) setInitialScenario(detail.scenario);
		const targetTooth = detail?.toothFdi ?? detail?.tooth;
		if (targetTooth && targetTooth >= 11 && targetTooth <= 48) setInitialTooth(targetTooth);
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

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const h = (window.location.hash || "").toLowerCase();
			const s = (window.location.search || "").toLowerCase();
			const tokens = ["implant", "surgery", "extraction", "resection", "sinus"];
			const matches = tokens.some((t) => h.includes(t) || s.includes(t));
			if (matches) {
				const cleanSearch = s ? s.replace(/[?&](implant|surgery|extraction|resection|sinus|tooth)[^&]*/gi, "").replace(/^[?&]/, "") : "";
				const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "");
				window.history.replaceState(null, "", newUrl);
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			}
		}
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleClose]);

	useEffect(() => {
		window.addEventListener("dente:open-surgery", handleOpenEvent);
		window.addEventListener("dente-open-surgery", handleOpenEvent);
		window.addEventListener("dente:open-surgery-hub", handleOpenEvent);
		window.addEventListener("dente-open-surgery-hub", handleOpenEvent);
		window.addEventListener("dente:open-implant-passport", handleOpenImplantPassport);
		window.addEventListener("dente-open-implant-passport", handleOpenImplantPassport);
		window.addEventListener("dente:open-implant-studio", handleOpenImplantStudio);
		window.addEventListener("dente-open-implant-studio", handleOpenImplantStudio);

		const handleHash = () => {
			if (checkUrlMatches()) {
				const h = (window.location.hash || "").toLowerCase();
				const s = (window.location.search || "").toLowerCase();
				setInitialTooth(parseUrlTooth());
				if (
					h.includes("implant-passport") ||
					s.includes("implant-passport") ||
					h.includes("implant_passport") ||
					s.includes("implant_passport") ||
					h.includes("passport") ||
					s.includes("passport")
				) {
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
			window.removeEventListener("dente:open-surgery-hub", handleOpenEvent);
			window.removeEventListener("dente-open-surgery-hub", handleOpenEvent);
			window.removeEventListener("dente:open-implant-passport", handleOpenImplantPassport);
			window.removeEventListener("dente-open-implant-passport", handleOpenImplantPassport);
			window.removeEventListener("dente:open-implant-studio", handleOpenImplantStudio);
			window.removeEventListener("dente-open-implant-studio", handleOpenImplantStudio);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, [handleOpenEvent, handleOpenImplantPassport, handleOpenImplantStudio]);

	if (!isOpen) return null;

	return (
		<ChairsideSurgeryHubModal
			isOpen={isOpen}
			onClose={handleClose}
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
