/**
 * @dental/web/components/pediatric/DirectPediatricLauncher.tsx
 * Standalone Direct Mount for Pediatric Dentistry Studio SSOT (Mandates 8b 60-100 lines, 8e, 8aq)
 * Listens for #pediatric, #children, ?pediatric=1 and dente:open-pediatric events.
 */

import React, { useEffect, useState, useCallback } from "react";
import { PediatricMixedDentitionModal } from "../odontogram/PediatricMixedDentitionModal";
import { PediatricBraveryDiplomaModal } from "./PediatricBraveryDiplomaModal";

export const DirectPediatricLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		if (s.includes("diploma") || h.includes("diploma") || h.includes("bravery")) {
			return false;
		}
		return (
			s.includes("pediatric") ||
			h.includes("pediatric") ||
			h.includes("children") ||
			s.includes("children")
		);
	});

	const [isDiplomaOpen, setIsDiplomaOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("diploma") ||
			h.includes("diploma") ||
			h.includes("bravery")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleOpenDiploma = () => setIsDiplomaOpen(true);
		window.addEventListener("dente-open-pediatric", handleOpen);
		window.addEventListener("dente:open-pediatric", handleOpen);
		window.addEventListener("dente-open-bravery-diploma", handleOpenDiploma);
		window.addEventListener("dente:open-bravery-diploma", handleOpenDiploma);

		const handleHash = () => {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			const isDiploma = h.includes("diploma") || h.includes("bravery") || s.includes("diploma");
			if (isDiploma) {
				setIsDiplomaOpen(true);
				setIsOpen(false);
			} else if (
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
			window.removeEventListener("dente-open-bravery-diploma", handleOpenDiploma);
			window.removeEventListener("dente:open-bravery-diploma", handleOpenDiploma);
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

	const handleCloseDiploma = useCallback(() => {
		setIsDiplomaOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("diploma");
			url.searchParams.delete("bravery");
			const cleanHash = window.location.hash.replace(/#(pediatric-diploma|bravery-diploma|diploma)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	return (
		<>
			<PediatricMixedDentitionModal
				isOpen={isOpen}
				onClose={handleClose}
				initialAge={6.5}
			/>
			<PediatricBraveryDiplomaModal
				isOpen={isDiplomaOpen}
				onClose={handleCloseDiploma}
				patientName="Маленький Герой"
				patientAgeYears={6}
				doctorName="Детский врач-стоматолог"
				clinicName="Детское отделение DENTE"
			/>
		</>
	);
};

DirectPediatricLauncher.displayName = "DirectPediatricLauncher";
export default DirectPediatricLauncher;
