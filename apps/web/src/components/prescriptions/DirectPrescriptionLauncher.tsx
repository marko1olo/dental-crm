/**
 * DirectPrescriptionLauncher.tsx — Standalone Direct Mount for Medical Prescriptions Studio SSOT
 * Mandates: 8b (60–80 lines sweet spot), 8e (Doctor Autonomy), 8aq (Live UI Mount).
 * Listens to #prescriptions, #rx, #prescription-studio, ?prescriptions=1, ?rx=1.
 */

import React, { useState, useEffect, useCallback } from "react";
import { PrescriptionStudioModal } from "./PrescriptionStudioModal";

export const DirectPrescriptionLauncher: React.FC = () => {
	const checkUrlTrigger = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const hash = window.location.hash.toLowerCase();
		const search = window.location.search.toLowerCase();
		return (
			hash.includes("prescription") ||
			hash.includes("#rx") ||
			hash.includes("rx-studio") ||
			search.includes("prescriptions=1") ||
			search.includes("prescription=1") ||
			search.includes("rx=1")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkUrlTrigger);

	useEffect(() => {
		const handleHashOrPop = () => {
			if (checkUrlTrigger()) {
				setIsOpen(true);
			}
		};

		const handleCustomOpen = () => setIsOpen(true);

		window.addEventListener("hashchange", handleHashOrPop);
		window.addEventListener("popstate", handleHashOrPop);
		window.addEventListener("dente:open-prescriptions", handleCustomOpen);
		window.addEventListener("dente-open-prescriptions", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashOrPop);
			window.removeEventListener("popstate", handleHashOrPop);
			window.removeEventListener("dente:open-prescriptions", handleCustomOpen);
			window.removeEventListener("dente-open-prescriptions", handleCustomOpen);
		};
	}, [checkUrlTrigger]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("rx");
			url.searchParams.delete("prescription");
			url.searchParams.delete("prescriptions");
			const cleanHash = window.location.hash.replace(/#(prescriptions|rx|prescription|prescription-studio)/gi, "");
			window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<PrescriptionStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			patientName="Иванова Мария Сергеевна"
			doctorName="Д-р Соколов А. В."
			doctorSpecialty="Врач-стоматолог-терапевт"
			clinicName="Стоматологическая клиника «ДЕНТЕ»"
			clinicAddress="г. Москва, ул. Большая Полянка, д. 28, стр. 1"
			clinicPhone="+7 (495) 215-55-40"
			clinicOgrn="ОГРН 1157746123456"
			diary={{
				diagnosisIcd10: "K04.0 Острый пульпит",
				notes: "Острый пульпит зуба 46, показано медикаментозное прикрытие и памятка пациенту.",
			}}
		/>
	);
};

DirectPrescriptionLauncher.displayName = "DirectPrescriptionLauncher";
export default DirectPrescriptionLauncher;
