/**
 * DirectImplantologyLauncher.tsx — Прямой автономный лаунчер студии имплантологии и паспорта (Мандаты 8b, 8aq).
 * Монтируется в AppShell и StandaloneLaunchers под #implants, #implant-passport, #surgery-implant, ?implants=1.
 */

import React, { useEffect, useState } from "react";
import { ImplantologyStudioModal, type ImplantStudioTab } from "./ImplantologyStudioModal";

const DEMO_SURGICAL_PATIENT = {
	id: "pat-demo-implant",
	fullName: "Иванов Иван Иванович",
	doctorName: "Д-р Воронов А. В.",
	doctorId: "DOC-VORONOV",
};

export const DirectImplantologyLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("implant-passport") ||
			s.includes("implants") ||
			s.includes("surgery-implant") ||
			s.includes("implant-studio") ||
			h.includes("implant-passport") ||
			h.includes("implants") ||
			h.includes("surgery-implant") ||
			h.includes("implant-studio")
		);
	});

	const [initialTab, setInitialTab] = useState<ImplantStudioTab>("protocol");
	const [toothFdi, setToothFdi] = useState<number>(46);

	useEffect(() => {
		const handleOpenStudio = (e?: Event) => {
			const detail = (e as CustomEvent<{ tab?: ImplantStudioTab; tooth?: number }>)?.detail;
			if (detail?.tab) setInitialTab(detail.tab);
			if (detail?.tooth) setToothFdi(detail.tooth);
			setIsOpen(true);
		};

		window.addEventListener("dente:open-implant-studio", handleOpenStudio);
		window.addEventListener("dente:open-implant-passport", handleOpenStudio);
		window.addEventListener("dente-open-implant-passport", handleOpenStudio);

		const handleLocationChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			const matches =
				s.includes("implant-passport") ||
				s.includes("implants") ||
				s.includes("surgery-implant") ||
				s.includes("implant-studio") ||
				h.includes("implant-passport") ||
				h.includes("implants") ||
				h.includes("surgery-implant") ||
				h.includes("implant-studio");

			if (matches) {
				if (s.includes("implant-passport") || h.includes("implant-passport")) {
					setInitialTab("passport");
				} else {
					setInitialTab("protocol");
				}
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);

		return () => {
			window.removeEventListener("dente:open-implant-studio", handleOpenStudio);
			window.removeEventListener("dente:open-implant-passport", handleOpenStudio);
			window.removeEventListener("dente-open-implant-passport", handleOpenStudio);
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<ImplantologyStudioModal
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			patientName={DEMO_SURGICAL_PATIENT.fullName}
			patientId={DEMO_SURGICAL_PATIENT.id}
			doctorName={DEMO_SURGICAL_PATIENT.doctorName}
			doctorId={DEMO_SURGICAL_PATIENT.doctorId}
			initialTooth={toothFdi}
			initialTab={initialTab}
		/>
	);
};

export default DirectImplantologyLauncher;
