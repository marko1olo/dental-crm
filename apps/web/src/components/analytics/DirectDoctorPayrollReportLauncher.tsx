/**
 * DENTE Dental CRM — Direct Doctor & Assistant Payroll Report Launcher
 * Mandate 8b (<= 100 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 * Allows instant, robust standalone deep-linking to DoctorPayrollReport for executive oversight.
 */

import React, { Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DoctorPayrollReport } from "./DoctorPayrollReport";

export const DirectDoctorPayrollReportLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("doctor_payroll") ||
			h.includes("doctor-payroll-report") ||
			h.includes("executive-payroll") ||
			s.includes("executive_payroll") ||
			h.includes("assistant-payroll") ||
			s.includes("assistant_payroll")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-doctor-payroll-report", handleOpen);
		window.addEventListener("dente:open-doctor-payroll-report", handleOpen);

		const handleHashChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("doctor_payroll") ||
				h.includes("doctor-payroll-report") ||
				h.includes("executive-payroll") ||
				s.includes("executive_payroll") ||
				h.includes("assistant-payroll") ||
				s.includes("assistant_payroll")
			) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-doctor-payroll-report", handleOpen);
			window.removeEventListener("dente:open-doctor-payroll-report", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("doctor_payroll");
			url.searchParams.delete("executive_payroll");
			url.searchParams.delete("assistant_payroll");
			const cleanHash = window.location.hash.replace(
				/#doctor-payroll-report|#executive-payroll|#assistant-payroll/g,
				"",
			);
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<div
			id="direct-doctor-payroll-overlay"
			className="fixed inset-0 z-[9999] bg-[var(--canvas)]/95 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label="Ведомость начисления зарплат врачам и ассистентам"
		>
			<div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)]" />
						<span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
							Ведомость начисления зарплат и мотивации персонала (Net Revenue)
						</span>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть ведомость"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1">
					<Suspense
						fallback={
							<div className="p-8 text-center text-[var(--muted)]">
								Загрузка ведомости начисления зарплат...
							</div>
						}
					>
						<DoctorPayrollReport period="month" />
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export default DirectDoctorPayrollReportLauncher;
