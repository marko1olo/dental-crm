/**
 * @dental/web/components/hygiene/DirectHygieneLauncher.tsx
 *
 * DENTE Dental CRM — Автономный лаунчер студии профессиональной гигиены и индекса OHI-S (Мандаты 8b 60–100 строк, 8aq).
 * Deep Link Mount: #hygiene, #cleaning, #prophy, #hygiene-studio, ?hygiene=1, ?cleaning=1.
 * Монтируется в AppShell.tsx и StandaloneLaunchers.tsx (Мандат 8aq).
 */

import React, { useState, useEffect, useCallback } from "react";
import { HygieneStudioModal } from "./HygieneStudioModal";

function checkIsHygieneActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash.toLowerCase();
	const s = window.location.search.toLowerCase();
	const params = new URLSearchParams(s);
	return (
		h.includes("hygiene") ||
		h.includes("cleaning") ||
		h.includes("prophy") ||
		params.get("hygiene") === "1" ||
		params.get("cleaning") === "1" ||
		params.get("standalone") === "hygiene"
	);
}

function readPatientNameFromUrl(): string {
	if (typeof window === "undefined") return "Пациент приёма";
	const params = new URLSearchParams(window.location.search || "");
	return params.get("patientName") || "Кузнецова Елена Павловна";
}

export const DirectHygieneLauncher: React.FC = () => {
	const [isActive, setIsActive] = useState<boolean>(checkIsHygieneActive);
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [patientName, setPatientName] = useState<string>(readPatientNameFromUrl);

	useEffect(() => {
		const handleLocationChange = () => {
			const active = checkIsHygieneActive();
			setIsActive(active);
			if (active) {
				setIsOpen(true);
				setPatientName(readPatientNameFromUrl());
			}
		};

		const handleOpenEvent = (e: Event) => {
			setIsActive(true);
			setIsOpen(true);
			const custom = e as CustomEvent<{ patientName?: string }>;
			if (custom.detail?.patientName) {
				setPatientName(custom.detail.patientName);
			}
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-hygiene", handleOpenEvent);
		window.addEventListener("dente:open-cleaning", handleOpenEvent);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-hygiene", handleOpenEvent);
			window.removeEventListener("dente:open-cleaning", handleOpenEvent);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setIsActive(false);
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			if (hash.includes("hygiene") || hash.includes("cleaning") || hash.includes("prophy")) {
				const cleanHash = hash.replace(/#(hygiene-studio|hygiene|cleaning|prophy)/gi, "");
				const url = new URL(window.location.href);
				url.searchParams.delete("hygiene");
				url.searchParams.delete("cleaning");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
			}
		}
	}, []);

	if (!isActive || !isOpen) return null;

	return (
		<HygieneStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientName={patientName}
			doctorName="Д-р Смирнова А.В."
			previousOhiS={2.4}
		/>
	);
};

DirectHygieneLauncher.displayName = "DirectHygieneLauncher";
export default DirectHygieneLauncher;
