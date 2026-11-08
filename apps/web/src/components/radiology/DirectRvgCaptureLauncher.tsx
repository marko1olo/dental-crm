/**
 * DirectRvgCaptureLauncher.tsx — Прямой автономный лаунчер аппаратного контура радиовизиографа (Мандаты 8b, 8e, 8aq, [RAD-03]).
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 60–100 строк.
 * - Мандат 8aq: Монтирование в живой UI (AppShell.tsx).
 * - Слушает URL хэши: #rvg-capture, #direct-rvg, #rvg-hardware.
 * - Слушает search-параметры: ?stand=rvg-capture, ?rvg-capture=1, ?direct-rvg=1.
 * - Слушает кастомные ивенты: "dente:open-rvg-capture", "dente-open-rvg-capture".
 */

import React, { useEffect, useState, useCallback } from "react";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import { DirectRvgCaptureModal } from "./DirectRvgCaptureModal";

export const DirectRvgCaptureLauncher: React.FC = () => {
	const checkShouldOpen = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const s = (window.location.search || "").toLowerCase();
		const h = (window.location.hash || "").toLowerCase();
		return (
			s.includes("rvg-capture") ||
			h.includes("rvg-capture") ||
			s.includes("direct-rvg") ||
			h.includes("direct-rvg") ||
			s.includes("rvg-hardware") ||
			h.includes("rvg-hardware")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkShouldOpen);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleClose = () => setIsOpen(false);

		window.addEventListener("dente:open-rvg-capture", handleOpen);
		window.addEventListener("dente-open-rvg-capture", handleOpen);

		const handleNavigation = () => {
			if (checkShouldOpen()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleNavigation);
		window.addEventListener("popstate", handleNavigation);

		return () => {
			window.removeEventListener("dente:open-rvg-capture", handleOpen);
			window.removeEventListener("dente-open-rvg-capture", handleOpen);
			window.removeEventListener("hashchange", handleNavigation);
			window.removeEventListener("popstate", handleNavigation);
		};
	}, [checkShouldOpen]);

	const handleCloseModal = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined" && window.location.hash) {
			const h = window.location.hash.toLowerCase();
			if (
				h.includes("rvg-capture") ||
				h.includes("direct-rvg") ||
				h.includes("rvg-hardware")
			) {
				history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);

	const patientName =
		patientCoreDraft.fullName?.trim() ||
		(selectedPatientId ? `Пациент #${selectedPatientId}` : "Пациент не выбран");
	const patientCardNumber = selectedPatientId ? `ЭМК №${selectedPatientId}` : "Карта не выбрана";
	const initialToothFdi = activeToothNumber ? String(activeToothNumber) : undefined;

	if (!isOpen) return null;

	return (
		<DirectRvgCaptureModal
			isOpen={isOpen}
			onClose={handleCloseModal}
			patientName={patientName}
			patientCardNumber={patientCardNumber}
			doctorName="Лечащий врач"
			initialToothFdi={initialToothFdi}
		/>
	);
};

export default DirectRvgCaptureLauncher;
