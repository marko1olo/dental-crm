/**
 * DirectPrescriptionLauncher.tsx — Standalone Direct Mount for Medical Prescriptions
 * Mandates: 8b (<= 120 lines), 8e (Doctor Autonomy), 8aq (Live UI Mount).
 */

import React, { useEffect, useState } from "react";
import { PrescriptionModal } from "./PrescriptionModal";

const DEMO_PATIENT = {
	id: "pat-demo-01",
	fullName: "Иванова Мария Сергеевна",
	birthDate: "1988-04-12",
	cardNumber: "К-4821",
	gender: "female" as const,
	allergies: ["Пенициллины", "Аспирин"],
	diagnosis: "K02.1 Глубокий кариес дентина",
	address: "г. Москва, ул. Тверская, д. 12, кв. 45",
	snils: "123-456-789 00",
	policyNumber: "7700 1234567890",
};

export const DirectPrescriptionLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("prescription") ||
			s.includes("prescriptions") ||
			s.includes("rx") ||
			h.includes("prescription") ||
			h.includes("prescriptions") ||
			h.includes("rx")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-prescriptions", handleOpen);
		window.addEventListener("dente-open-prescriptions", handleOpen);
		window.addEventListener("dente-open-prescription", handleOpen);
		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("prescription") ||
				s.includes("prescriptions") ||
				s.includes("rx") ||
				h.includes("prescription") ||
				h.includes("prescriptions") ||
				h.includes("rx")
			) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente:open-prescriptions", handleOpen);
			window.removeEventListener("dente-open-prescriptions", handleOpen);
			window.removeEventListener("dente-open-prescription", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("prescriptions");
			url.searchParams.delete("prescription");
			url.searchParams.delete("rx");
			const cleanHash = window.location.hash.replace(
				/#(prescriptions|prescription|rx)/g,
				"",
			);
			window.history.replaceState(
				{},
				"",
				url.pathname + (url.search ? url.search : "") + cleanHash,
			);
		}
	};

	return (
		<PrescriptionModal
			isOpen={isOpen}
			onClose={handleClose}
			patient={DEMO_PATIENT}
			doctorName="Д-р Соколов А. В."
			diary={{ diagnosisIcd10: "K02.1" }}
			allergies={DEMO_PATIENT.allergies}
			initialSelectedDrugIds={["amoxiclav_875_125", "nimesulide_100"]}
		/>
	);
};

DirectPrescriptionLauncher.displayName = "DirectPrescriptionLauncher";
