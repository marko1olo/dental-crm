/**
 * @dental/web/components/endo/DirectEndodonticsLauncher.tsx
 * DENTE Dental CRM — Автономный лаунчер эндодонтической студии (Мандаты 8b <= 100 строк, 8aq).
 * Deep Link Mount: #endo, #endodontics, #root-canals, #endo-studio, ?endo=1, ?endodontics=1.
 */

import React, { useState, useEffect, useCallback } from "react";
import { EndodonticStudioModal } from "./EndodonticStudioModal";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";
import { isDemoShowcaseMode } from "../../lib/demoMode";

function checkIsEndoActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const params = new URLSearchParams(window.location.search.toLowerCase());
	return (
		h.includes("endo") || h.includes("endodontics") || h.includes("root-canals") || h.includes("rootcanal") ||
		params.get("endo") === "1" || params.get("endodontics") === "1" || params.get("root_canals") === "1" || params.get("standalone") === "endo" || params.get("stand") === "endo" || params.get("stand") === "endodontics"
	);
}

function readToothNumberFromUrl(): number {
	if (typeof window === "undefined") return 16;
	const params = new URLSearchParams(window.location.search || "");
	const toothParam = params.get("tooth") || params.get("toothNumber");
	const parsed = toothParam ? parseInt(toothParam, 10) : 16;
	return !Number.isNaN(parsed) && parsed >= 11 && parsed <= 48 ? parsed : 16;
}

function readPatientIdFromContext(): string | undefined {
	if (typeof window === "undefined") return undefined;
	const params = new URLSearchParams(window.location.search || "");
	const fromSearch = params.get("patientId") || params.get("patient");
	if (fromSearch) return fromSearch;
	const match = /[?&](?:patientId|patient)=([^&]+)/.exec(window.location.hash || "");
	if (match?.[1]) return decodeURIComponent(match[1]);
	return usePatientStore.getState().selectedPatientId || (isDemoShowcaseMode() ? "demo-patient-1" : undefined);
}

export const DirectEndodonticsLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsEndoActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [toothNumber, setToothNumber] = useState<number>(readToothNumberFromUrl);
	const [patientId, setPatientId] = useState<string | undefined>(readPatientIdFromContext);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsEndoActive();
			setIsActive(active);
			if (active) { setIsOpen(true); setToothNumber(readToothNumberFromUrl()); setPatientId(readPatientIdFromContext()); }
		};
		const handleOpenEvent = (e: Event) => {
			setIsActive(true); setIsOpen(true);
			const custom = e as CustomEvent<{ toothNumber?: number; patientId?: string }>;
			setToothNumber(custom.detail?.toothNumber || readToothNumberFromUrl());
			if (custom.detail?.patientId) setPatientId(custom.detail.patientId);
		};

		["hashchange", "popstate"].forEach((ev) => window.addEventListener(ev, handleLocationChange));
		["dente:open-endo", "dente:open-endodontics", "dente:open-root-canals"].forEach((ev) => window.addEventListener(ev, handleOpenEvent));
		return () => {
			["hashchange", "popstate"].forEach((ev) => window.removeEventListener(ev, handleLocationChange));
			["dente:open-endo", "dente:open-endodontics", "dente:open-root-canals"].forEach((ev) => window.removeEventListener(ev, handleOpenEvent));
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false); setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (hash.includes("endo") || hash.includes("root-canals") || hash.includes("rootcanal")) {
				const cleanHash = hash.replace(/#(endo-studio|endodontics|root-canals|rootcanal|endo)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("endo"); url.searchParams.delete("endodontics"); url.searchParams.delete("root_canals");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	if (!isActive || !isOpen) return null;
	const pStore = usePatientStore.getState();
	const patientName = (patientId && pStore.patients?.find((p) => p.id === patientId)?.fullName) ||
		pStore.patientCoreDraft?.fullName || (isDemoShowcaseMode() ? "Смирнова Елена Сергеевна" : (patientId ? `Пациент #${patientId.slice(0, 8)}` : "Пациент"));
	const doctorName = useAppStore.getState().activeDoctorName || "Д-р Смирнов А.П.";

	return (
		<EndodonticStudioModal
			isOpen={isOpen} onClose={handleClose} toothNumber={toothNumber} toothState="Острый пульпит (K04.0)"
			patientId={patientId} patientName={patientName} doctorName={doctorName} clinicName="Стоматологическая клиника DENTE"
		/>
	);
};

DirectEndodonticsLauncher.displayName = "DirectEndodonticsLauncher";
export default DirectEndodonticsLauncher;
