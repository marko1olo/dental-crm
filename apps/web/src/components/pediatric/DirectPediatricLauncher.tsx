/**
 * @dental/web/components/pediatric/DirectPediatricLauncher.tsx
 * Standalone Direct Mount for Pediatric Dentistry Studio SSOT (Mandates 8b 60-100 lines, 8e, 8aq)
 * Listens for #pediatric, #children, ?pediatric=1 and dente:open-pediatric events.
 */

import React, { useEffect, useState, useCallback } from "react";
import { PediatricStudioModal } from "./PediatricStudioModal";

export const DirectPediatricLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("pediatric") ||
			h.includes("pediatric") ||
			h.includes("children") ||
			s.includes("children")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-pediatric", handleOpen);
		window.addEventListener("dente:open-pediatric", handleOpen);

		const handleHash = () => {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			if (
				h.includes("pediatric") ||
				h.includes("children") ||
				s.includes("pediatric") ||
				s.includes("children")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente-open-pediatric", handleOpen);
			window.removeEventListener("dente:open-pediatric", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("pediatric");
			url.searchParams.delete("children");
			const cleanHash = window.location.hash.replace(/#(pediatric-studio|pediatric|children)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	return (
		<PediatricStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientName="Артём Смирнов"
			patientAgeYears={6}
			patientWeightKg={20}
			initialToothNumber={54}
			doctorName="Д-р Смирнова Е.В."
			clinicName="Клиника DENTE"
		/>
	);
};

DirectPediatricLauncher.displayName = "DirectPediatricLauncher";
export default DirectPediatricLauncher;
