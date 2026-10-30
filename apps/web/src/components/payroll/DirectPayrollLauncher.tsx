/**
 * DirectPayrollLauncher.tsx — Standalone Direct Mount for Doctor Payroll Studio
 * Mandate 8b (60–90 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 * Reacts to window hashes #payroll, #doctor-payroll, #salary, #earnings, #doctor-payout and events dente:open-payroll.
 */

import React, { useEffect, useState } from "react";
import { DoctorPayrollStudioModal } from "./DoctorPayrollStudioModal";

export const DirectPayrollLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h.includes("#payroll") ||
			h.includes("#doctor-payroll") ||
			h.includes("#salary") ||
			h.includes("#earnings") ||
			h.includes("#doctor-payout") ||
			s.includes("payroll=1") ||
			s.includes("doctor-payroll=1") ||
			s.includes("doctor-payout=1")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-payroll", handleOpen);
		window.addEventListener("dente:open-payroll", handleOpen);
		window.addEventListener("dente:open-doctor-payroll", handleOpen);

		const handleHashChange = () => {
			const h = window.location.hash || "";
			if (
				h.includes("#payroll") ||
				h.includes("#doctor-payroll") ||
				h.includes("#salary") ||
				h.includes("#earnings") ||
				h.includes("#doctor-payout")
			) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-payroll", handleOpen);
			window.removeEventListener("dente:open-payroll", handleOpen);
			window.removeEventListener("dente:open-doctor-payroll", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("payroll");
			url.searchParams.delete("doctor-payroll");
			url.searchParams.delete("doctor-payout");
			const cleanHash = window.location.hash.replace(
				/#payroll|#doctor-payroll|#salary|#earnings|#doctor-payout/g,
				"",
			);
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<DoctorPayrollStudioModal
			isOpen={isOpen}
			onClose={handleClose}
		/>
	);
};

export default DirectPayrollLauncher;
