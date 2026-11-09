/**
 * DirectPayrollLauncher.tsx — Standalone Direct Mount for Doctor Payroll Studio
 * Mandate 8b (60–80 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 * Reacts to window hashes #payroll, #doctor-payroll, #salary, #commissions, #executive-payroll, #doctor-payroll-report,
 * query parameters doctor_payroll=1, executive_payroll=1, and events dente:open-payroll.
 */

import React, { useEffect, useState } from "react";
import { DoctorPayrollStudioModal } from "./DoctorPayrollStudioModal";

const HASH_REGEX = /#(?:payroll|doctor-payroll|salary|commissions|executive-payroll|doctor-payroll-report)/;
const QUERY_REGEX = /(?:payroll|doctor-payroll|doctor_payroll|executive_payroll|salary|commissions)=1/;

const shouldOpen = (): boolean => {
	if (typeof window === "undefined") return false;
	const hash = window.location.hash || "";
	const search = window.location.search || "";
	return HASH_REGEX.test(hash) || QUERY_REGEX.test(search);
};

export const DirectPayrollLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(shouldOpen);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const events = [
			"dente-open-payroll",
			"dente:open-payroll",
			"dente:open-doctor-payroll",
			"dente-open-doctor-payroll-report",
			"dente:open-doctor-payroll-report",
		];
		events.forEach((eventName) => window.addEventListener(eventName, handleOpen));

		const handleHashChange = () => {
			setIsOpen(shouldOpen());
		};
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			events.forEach((eventName) => window.removeEventListener(eventName, handleOpen));
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			const params = ["payroll", "doctor-payroll", "doctor_payroll", "executive_payroll", "salary", "commissions"];
			params.forEach((param) => url.searchParams.delete(param));
			const cleanHash = window.location.hash.replace(HASH_REGEX, "");
			const newUrl = url.pathname + (url.search || "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return <DoctorPayrollStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectPayrollLauncher;
