/**
 * DirectInsuranceLauncher.tsx — Standalone Direct Mount for Insurance & DMS Billing.
 *
 * Mandates:
 * - 8b (<= 120 lines)
 * - 8e (Doctor & Staff Autonomy)
 * - 8aq (Live UI Mount in AppShell.tsx on route #insurance / #dms)
 */

import React, { useEffect, useState } from "react";
import { InsuranceWorkspaceModal } from "./InsuranceWorkspaceModal.js";

const DEMO_INSURANCE_PATIENT = {
	id: "pat-dms-01",
	fullName: "Соколова Анна Викторовна",
	birthDate: "15.04.1990",
	cardNumber: "К-4821",
	policyNumber: "СГЗ-2026-998811",
};

export const DirectInsuranceLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("insurance") ||
			s.includes("dms") ||
			h.includes("insurance") ||
			h.includes("dms")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente:open-insurance", handleOpen);
		window.addEventListener("dente-open-insurance", handleOpen);
		window.addEventListener("dente:open-dms", handleOpen);
		window.addEventListener("dente-open-dms", handleOpen);

		const handleHash = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("insurance") ||
				s.includes("dms") ||
				h.includes("insurance") ||
				h.includes("dms")
			) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente:open-insurance", handleOpen);
			window.removeEventListener("dente-open-insurance", handleOpen);
			window.removeEventListener("dente:open-dms", handleOpen);
			window.removeEventListener("dente-open-dms", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("insurance");
			url.searchParams.delete("dms");
			const cleanHash = window.location.hash.replace(/#(insurance|dms)/g, "");
			window.history.replaceState(
				{},
				"",
				url.pathname + (url.search ? url.search : "") + cleanHash,
			);
		}
	};

	return (
		<InsuranceWorkspaceModal
			isOpen={isOpen}
			onClose={handleClose}
			patient={DEMO_INSURANCE_PATIENT}
			onApplySplitToCashbox={(splitData) => {
				// Применение сплита в кассу и оповещение кассового модуля
				window.dispatchEvent(
					new CustomEvent("dente:cashbox-apply-split", { detail: splitData }),
				);
				handleClose();
			}}
		/>
	);
};

DirectInsuranceLauncher.displayName = "DirectInsuranceLauncher";
export default DirectInsuranceLauncher;
