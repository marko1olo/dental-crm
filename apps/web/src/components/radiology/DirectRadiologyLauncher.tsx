/**
 * DirectRadiologyLauncher.tsx — Прямой автономный лаунчер радиовизиографа и 2D просмотрщика снимков (Мандаты 8b, 8aq).
 * Монтируется в корневой AppShell, слушает хэш #radiology / #visiograph и custom event.
 */
import React, { useEffect, useState } from "react";
import { VisiographStudyViewer } from "./VisiographStudyViewer";
import { VisiographHotFolderToast } from "./VisiographHotFolderToast";

const DEMO_RADIOLOGY_PATIENT = {
	id: "pat-walkin",
	fullName: "Захаров Иван Дмитриевич",
	tooth: "16",
};

export const DirectRadiologyLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("radiology") ||
			s.includes("visiograph") ||
			h.includes("radiology") ||
			h.includes("visiograph")
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
				s.includes("radiology") ||
				s.includes("visiograph") ||
				h.includes("radiology") ||
				h.includes("visiograph")
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

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[9999] bg-[var(--paper)] p-2 sm:p-6 flex flex-col justify-center items-center"
			data-testid="direct-radiology-launcher-root"
		>
			<div className="w-full max-w-5xl h-full max-h-[850px] shadow-2xl rounded-2xl overflow-hidden">
				<VisiographStudyViewer
					studyTitle="Прицельная радиовизиография RVG #16"
					patientName={DEMO_RADIOLOGY_PATIENT.fullName}
					patientId={DEMO_RADIOLOGY_PATIENT.id}
					initialTooth={DEMO_RADIOLOGY_PATIENT.tooth}
					onClose={() => setIsOpen(false)}
				/>
			</div>
			{/* Всплывающий тост сетевого хотфолдера визиографа */}
			<VisiographHotFolderToast />
		</div>
	);
};

export default DirectRadiologyLauncher;
