/**
 * apps/web/src/components/sanpin/DirectSterilizationLauncher.tsx
 *
 * Прямой автономный лаунчер хаба стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8aq):
 * - Слушатели URL хешей: #sterilization, #sanpin-autoclave, #autoclave, ?sterilization=1, ?autoclave=1
 * - Слушатели глобальных событий: "dente:open-sterilization", "dente:open-autoclave"
 * - Монтирует канонический мастер-хаб SterilizationHubModal.
 * - Размер строго 50–90 строк (Мандат 8b).
 */

import React, { useState, useEffect } from "react";
import { SterilizationHubModal } from "./SterilizationHubModal";

function checkIsSterilizationActive(): boolean {
	if (typeof window === "undefined") return false;
	const h = window.location.hash || "";
	const s = window.location.search || "";
	const params = new URLSearchParams(s);
	return (
		h.includes("sterilization") ||
		h.includes("sanpin-autoclave") ||
		h.includes("autoclave") ||
		params.get("sterilization") === "1" ||
		params.get("autoclave") === "1"
	);
}

export const DirectSterilizationLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState(checkIsSterilizationActive);

	useEffect(() => {
		const handleLocationChange = () => {
			setIsOpen(checkIsSterilizationActive());
		};
		const handleOpenSterilization = () => setIsOpen(true);

		window.addEventListener("hashchange", handleLocationChange);
		window.addEventListener("popstate", handleLocationChange);
		window.addEventListener("dente:open-sterilization", handleOpenSterilization);
		window.addEventListener("dente:open-autoclave", handleOpenSterilization);

		return () => {
			window.removeEventListener("hashchange", handleLocationChange);
			window.removeEventListener("popstate", handleLocationChange);
			window.removeEventListener("dente:open-sterilization", handleOpenSterilization);
			window.removeEventListener("dente:open-autoclave", handleOpenSterilization);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<div
			data-testid="direct-sterilization-launcher"
			className="fixed inset-0 z-[9998] pointer-events-auto"
		>
			<SterilizationHubModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
			/>
		</div>
	);
};

export default DirectSterilizationLauncher;
