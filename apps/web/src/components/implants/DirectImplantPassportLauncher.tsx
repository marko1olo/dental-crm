/**
 * DirectImplantPassportLauncher.tsx — Прямой автономный лаунчер паспорта и протокола имплантации (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэш #implant-passport / #implants и custom event.
 */
import React, { useEffect, useState } from "react";
import { ImplantPassportModal } from "./ImplantPassportModal";

const DEMO_IMPLANT_PATIENT = {
	id: "pat-demo-implant",
	fullName: "Иванов Иван Иванович",
	doctorName: "Д-р Воронов А. В.",
};

export const DirectImplantPassportLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("implant-passport") ||
			s.includes("implants") ||
			h.includes("implant-passport") ||
			h.includes("implants")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-implant-passport", handleOpen);
		window.addEventListener("dente-open-implant-passport", handleOpen);

		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("implant-passport") ||
				s.includes("implants") ||
				h.includes("implant-passport") ||
				h.includes("implants")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);

		return () => {
			window.removeEventListener("dente:open-implant-passport", handleOpen);
			window.removeEventListener("dente-open-implant-passport", handleOpen);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<ImplantPassportModal
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			patientName={DEMO_IMPLANT_PATIENT.fullName}
			patientId={DEMO_IMPLANT_PATIENT.id}
			doctorName={DEMO_IMPLANT_PATIENT.doctorName}
			initialTooth={46}
		/>
	);
};

export default DirectImplantPassportLauncher;
