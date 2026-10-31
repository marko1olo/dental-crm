/**
 * apps/web/src/components/finance/DirectCashierLauncher.tsx
 * Канонический лаунчер глубокой привязки Студии кассы и чеков DENTE CRM.
 * Мандаты: 8aq (Монтирование в UI), 8e (Автономия кассира), 8b (строго 70-90 строк).
 */

import React, { useEffect, useState, useCallback } from "react";
import { CashierStudioModal } from "./CashierStudioModal.js";

export interface CashierLauncherEventDetail {
	readonly mode?: "checkout" | "shift" | "history";
	readonly amountRub?: number;
	readonly amountKopecks?: number;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly invoiceId?: string;
	readonly cashierFullName?: string;
}

export const DirectCashierLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<"checkout" | "shift" | "history">("checkout");
	const [launchData, setLaunchData] = useState<CashierLauncherEventDetail | null>(null);

	const inspectUrl = useCallback(() => {
		if (typeof window === "undefined") return;
		const h = window.location.hash.toLowerCase();
		const s = window.location.search.toLowerCase();
		const hasCashier = h.includes("cashier") || h.includes("checkout") || h.includes("receipt") || h.includes("kassa");
		const hasQuery = s.includes("cashier=1") || s.includes("checkout=1") || s.includes("kassa=1");

		if (hasCashier || hasQuery) {
			if (h.includes("shift") || s.includes("shift")) setActiveTab("shift");
			else if (h.includes("receipt") || s.includes("history")) setActiveTab("history");
			else setActiveTab("checkout");
			setIsOpen(true);
		}
	}, []);

	useEffect(() => {
		inspectUrl();
		window.addEventListener("hashchange", inspectUrl);
		window.addEventListener("popstate", inspectUrl);
		const handleCustomOpen = (e: Event) => {
			const detail = (e as CustomEvent<CashierLauncherEventDetail>).detail;
			if (detail) {
				setLaunchData(detail);
				if (detail.mode) setActiveTab(detail.mode);
			}
			setIsOpen(true);
		};
		window.addEventListener("dente:open-cashier", handleCustomOpen);
		window.addEventListener("dente:open-checkout", handleCustomOpen);
		return () => {
			window.removeEventListener("hashchange", inspectUrl);
			window.removeEventListener("popstate", inspectUrl);
			window.removeEventListener("dente:open-cashier", handleCustomOpen);
			window.removeEventListener("dente:open-checkout", handleCustomOpen);
		};
	}, [inspectUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		setLaunchData(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#(cashier|checkout|receipt|kassa)[^&]*/g, "");
			const url = new URL(window.location.href);
			url.searchParams.delete("cashier");
			url.searchParams.delete("checkout");
			url.searchParams.delete("kassa");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	};

	return (
		<CashierStudioModal
			isOpen={isOpen} onClose={handleClose} initialTab={activeTab}
			totalDueRub={launchData?.amountRub} totalDueKopecks={launchData?.amountKopecks}
			patientId={launchData?.patientId} patientName={launchData?.patientName}
			invoiceId={launchData?.invoiceId} cashierFullName={launchData?.cashierFullName}
			onSuccess={handleClose}
		/>
	);
};

export default DirectCashierLauncher;
