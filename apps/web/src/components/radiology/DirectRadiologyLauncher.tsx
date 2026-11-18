/**
 * DirectRadiologyLauncher.tsx — Прямой автономный лаунчер радиовизиографа и 2D просмотрщика снимков (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэш #radiology / #visiograph и custom event.
 */
import React, { useEffect, useState, useCallback } from "react";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import { SensorStudyViewer } from "./SensorStudyViewer";
import { VisiographHotFolderToast } from "./VisiographHotFolderToast";

export const DirectRadiologyLauncher: React.FC = () => {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);

	const patientName =
		patientCoreDraft.fullName?.trim() ||
		(selectedPatientId ? `Пациент #${selectedPatientId}` : "Пациент не выбран");
	const patientId = selectedPatientId || undefined;
	const initialTooth = activeToothNumber ? String(activeToothNumber) : undefined;
	const studyTitle = initialTooth
		? `Прицельная радиовизиография RVG #${initialTooth}`
		: "Прицельная радиовизиография RVG";

	const checkShouldOpen = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const s = (window.location.search || "").toLowerCase();
		const h = (window.location.hash || "").toLowerCase();
		// Исключаем аппаратный захват, чтобы не перехватывать чужой скоуп
		if (
			h.includes("rvg-capture") ||
			h.includes("direct-rvg") ||
			h.includes("rvg-hardware") ||
			s.includes("rvg-capture") ||
			s.includes("direct-rvg")
		) {
			return false;
		}
		return (
			s.includes("radiology-standalone") ||
			h.includes("radiology-standalone") ||
			s.includes("radiology=1") ||
			h === "#radiology" ||
			h.startsWith("#radiology?") ||
			h.startsWith("#radiology/") ||
			s.includes("visiograph=1") ||
			h === "#visiograph" ||
			h.startsWith("#visiograph?") ||
			h.startsWith("#visiograph/") ||
			s.includes("xray-viewer") ||
			h.includes("xray-viewer") ||
			h.includes("study-viewer")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkShouldOpen);

	useEffect(() => {
		if (checkShouldOpen()) {
			setIsOpen(true);
		}

		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-radiology", handleOpen);
		window.addEventListener("dente-open-radiology", handleOpen);
		window.addEventListener("dente:open-visiograph", handleOpen);
		window.addEventListener("dente-open-visiograph", handleOpen);

		const handleNavigation = () => {
			if (checkShouldOpen()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleNavigation);
		window.addEventListener("popstate", handleNavigation);

		return () => {
			window.removeEventListener("dente:open-radiology", handleOpen);
			window.removeEventListener("dente-open-radiology", handleOpen);
			window.removeEventListener("dente:open-visiograph", handleOpen);
			window.removeEventListener("dente-open-visiograph", handleOpen);
			window.removeEventListener("hashchange", handleNavigation);
			window.removeEventListener("popstate", handleNavigation);
		};
	}, [checkShouldOpen]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined" && window.location.hash) {
			const h = window.location.hash.toLowerCase();
			if (
				h === "#radiology" ||
				h.startsWith("#radiology?") ||
				h.startsWith("#radiology/") ||
				h.includes("radiology-standalone") ||
				h === "#visiograph" ||
				h.startsWith("#visiograph?") ||
				h.startsWith("#visiograph/") ||
				h.includes("xray-viewer") ||
				h.includes("study-viewer")
			) {
				history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	return (
		<>
			{isOpen && (
				<div
					className="fixed inset-0 z-[9999] bg-[var(--paper)] p-2 sm:p-6 flex flex-col justify-center items-center"
					data-testid="direct-radiology-launcher-root"
				>
					<div className="w-full max-w-5xl h-full max-h-[850px] shadow-2xl rounded-2xl overflow-hidden">
						<SensorStudyViewer
							patientName={patientName}
							toothFdiCode={initialTooth}
							onClose={handleClose}
						/>
					</div>
				</div>
			)}
			{/* Всплывающий неблокирующий тост сетевого хотфолдера визиографа (активен всегда в фоне) */}
			<VisiographHotFolderToast />
		</>
	);
};

export default DirectRadiologyLauncher;
