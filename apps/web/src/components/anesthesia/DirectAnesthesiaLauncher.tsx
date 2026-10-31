/**
 * @dental/web/components/anesthesia/DirectAnesthesiaLauncher.tsx
 * Standalone Direct Mount for Chairside Anesthesia Studio (Mandates 8b 60-100 lines Sweet Spot, 8e, 8aq)
 * Listens for #anesthesia, #anesthetic, ?anesthesia=1, #emergency and dente:open-anesthesia events.
 */

import React, { useEffect, useState } from "react";
import { AnesthesiaStudioModal } from "./AnesthesiaStudioModal";

export const DirectAnesthesiaLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("anesthesia") ||
			h.includes("anesthesia") ||
			h.includes("anesthetic") ||
			s.includes("anesthetic") ||
			h.includes("narcotics") ||
			h.includes("emergency")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-anesthesia", handleOpen);
		window.addEventListener("dente:open-anesthesia", handleOpen);

		const handleHash = () => {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			if (
				h.includes("anesthesia") ||
				h.includes("anesthetic") ||
				s.includes("anesthesia") ||
				s.includes("anesthetic") ||
				h.includes("narcotics") ||
				h.includes("emergency")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente-open-anesthesia", handleOpen);
			window.removeEventListener("dente:open-anesthesia", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("anesthesia");
			url.searchParams.delete("anesthetic");
			const cleanHash = window.location.hash.replace(/#(anesthesia|anesthetic|narcotics|emergency)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	};

	return (
		<AnesthesiaStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			targetToothNumberFdi={16}
			patientWeightKg={70}
			patientAgeYears={35}
			patientName="Пациент"
			doctorName="Лечащий врач"
		/>
	);
};

DirectAnesthesiaLauncher.displayName = "DirectAnesthesiaLauncher";
