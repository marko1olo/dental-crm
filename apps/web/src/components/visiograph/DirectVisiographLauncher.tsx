/**
 * DirectVisiographLauncher.tsx — Прямой автономный лаунчер визиографа и лучевой диагностики (Мандаты 8b, 8aq).
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 60–100 строк.
 * - Мандат 8aq: Монтирование в живой UI (AppShell.tsx и StandaloneLaunchers.tsx).
 * - Слушает URL хэши: #visiograph, #xray, #radiology, #rvg, #imaging.
 * - Слушает search-параметры: ?visiograph=1, ?xray=1, ?radiology=1, ?rvg=1.
 * - Слушает кастомные ивенты: "dente:open-visiograph", "dente-open-visiograph".
 */

import React, { useEffect, useState, useCallback } from "react";
import { VisiographStudioModal } from "./VisiographStudioModal";

export const DirectVisiographLauncher: React.FC = () => {
	const checkShouldOpen = useCallback((): boolean => {
		if (typeof window === "undefined") return false;
		const s = (window.location.search || "").toLowerCase();
		const h = (window.location.hash || "").toLowerCase();
		return (
			s.includes("visiograph") ||
			s.includes("xray") ||
			s.includes("radiology") ||
			s.includes("rvg") ||
			s.includes("imaging") ||
			h.includes("visiograph") ||
			h.includes("xray") ||
			h.includes("radiology") ||
			h.includes("rvg") ||
			h.includes("imaging")
		);
	}, []);

	const [isOpen, setIsOpen] = useState<boolean>(checkShouldOpen);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleClose = () => setIsOpen(false);

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
			window.removeEventListener("dente:open-visiograph", handleOpen);
			window.removeEventListener("dente-open-visiograph", handleOpen);
			window.removeEventListener("hashchange", handleNavigation);
			window.removeEventListener("popstate", handleNavigation);
		};
	}, [checkShouldOpen]);

	const handleCloseModal = useCallback(() => {
		setIsOpen(false);
		if (typeof window !== "undefined" && window.location.hash) {
			const h = window.location.hash.toLowerCase();
			if (
				h.includes("visiograph") ||
				h.includes("xray") ||
				h.includes("radiology") ||
				h.includes("rvg") ||
				h.includes("imaging")
			) {
				// Очищаем хэш без перезагрузки страницы
				history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	}, []);

	if (!isOpen) return null;

	return (
		<VisiographStudioModal
			isOpen={isOpen}
			onClose={handleCloseModal}
			patientName="Захаров Иван Дмитриевич"
			patientId="pat_walkin"
			initialToothCode="16"
			initialModality="rvg"
		/>
	);
};

export default DirectVisiographLauncher;
