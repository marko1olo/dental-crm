/**
 * DirectRadiologyLauncher.tsx — Прямой автономный лаунчер радиовизиографа и 2D просмотрщика снимков (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэш #radiology / #visiograph и custom event.
 */
import React, { useEffect, useState } from "react";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import { VisiographStudyViewer } from "./VisiographStudyViewer";
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

	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("radiology-standalone") ||
			h.includes("radiology-standalone")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-radiology", handleOpen);
		window.addEventListener("dente-open-radiology", handleOpen);

		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("radiology-standalone") ||
				h.includes("radiology-standalone")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		window.addEventListener("popstate", handleHash);

		return () => {
			window.removeEventListener("dente:open-radiology", handleOpen);
			window.removeEventListener("dente-open-radiology", handleOpen);
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("popstate", handleHash);
		};
	}, []);

	return (
		<>
			{isOpen && (
				<div
					className="fixed inset-0 z-[9999] bg-[var(--paper)] p-2 sm:p-6 flex flex-col justify-center items-center"
					data-testid="direct-radiology-launcher-root"
				>
					<div className="w-full max-w-5xl h-full max-h-[850px] shadow-2xl rounded-2xl overflow-hidden">
						<VisiographStudyViewer
							studyTitle={studyTitle}
							patientName={patientName}
							patientId={patientId}
							initialTooth={initialTooth}
							onClose={() => setIsOpen(false)}
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
