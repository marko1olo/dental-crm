/**
 * apps/web/src/components/finance/DirectCashierLauncher.tsx
 * Канонический лаунчер глубокой привязки Студии кассы и чеков DENTE CRM (Мандаты: 8aq, 8e, 8b).
 */
import React, { useEffect, useState, useCallback } from "react";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal.js";

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
		const hasCashier = h.includes("cashier") || h.includes("receipt") || h.includes("kassa");
		const hasQuery = s.includes("cashier=1") || s.includes("kassa=1");
		if (hasCashier || hasQuery) {
			const targetTab = h.includes("shift") || s.includes("shift") ? "shift" : h.includes("receipt") || s.includes("history") ? "history" : "checkout";
			setActiveTab(targetTab);
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
		return () => {
			window.removeEventListener("hashchange", inspectUrl);
			window.removeEventListener("popstate", inspectUrl);
			window.removeEventListener("dente:open-cashier", handleCustomOpen);
		};
	}, [inspectUrl]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		setLaunchData(null);
		if (typeof window !== "undefined") {
			const cleanHash = window.location.hash.replace(/#(cashier|checkout|receipt|kassa)[^&]*/g, "");
			const url = new URL(window.location.href);
			["cashier", "checkout", "kassa"].forEach((k) => url.searchParams.delete(k));
			window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		}
	};

	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			mode="studio"
			initialTab={activeTab === "history" ? "tape" : activeTab}
			totalDueRub={launchData?.amountRub}
			totalDueKopecks={launchData?.amountKopecks}
			patientId={launchData?.patientId}
			patientName={launchData?.patientName}
			invoiceId={launchData?.invoiceId}
			cashierFullName={launchData?.cashierFullName}
			onSuccess={handleClose}
			containerTestId="cashier-studio-modal"
			submitButtonTestId="cashier-submit-btn"
			title="Студия кассы и чеков"
		/>
	);
};

export default DirectCashierLauncher;
