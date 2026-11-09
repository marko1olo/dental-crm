/**
 * apps/web/src/components/analytics/DirectDoctorPayrollReportLauncher.tsx
 *
 * Standalone direct mount for DoctorPayrollReport (Net Revenue & Assistant Wages).
 * Mandates: 8b (Sweet Spot <= 90 lines), 8e (Doctor Autonomy), 8aq (Mounted in UI Tree).
 * Reacts to window hashes #executive-payroll, #doctor-payroll-report, and query doctor_payroll=1.
 */

import React, { useEffect, useState, Suspense } from "react";
import { X, FileSpreadsheet } from "lucide-react";
import { DoctorPayrollReport } from "./DoctorPayrollReport";

export const DirectDoctorPayrollReportLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			h.includes("#executive-payroll") ||
			h.includes("#doctor-payroll-report") ||
			s.includes("doctor_payroll=1") ||
			s.includes("executive_payroll=1")
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
				h.includes("#executive-payroll") ||
				h.includes("#doctor-payroll-report") ||
				s.includes("doctor_payroll=1") ||
				s.includes("executive_payroll=1")
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
			const cleanHash = window.location.hash.replace(/#executive-payroll|#doctor-payroll-report/g, "");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<div
			id="direct-doctor-payroll-overlay"
			data-testid="direct-doctor-payroll-workspace"
			className="fixed inset-0 z-[9999] bg-[var(--canvas,#f8fafc)]/98 dark:bg-[var(--canvas,#020617)]/98 overflow-y-auto p-2 sm:p-4 md:p-6 flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label="Ведомость начисления заработной платы врачам"
		>
			<div className="max-w-6xl w-full mx-auto flex-1 flex flex-col space-y-4">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<span className="p-1.5 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]">
							<FileSpreadsheet className="w-5 h-5" />
						</span>
						<div>
							<h1 className="text-base sm:text-lg font-bold text-[var(--ink)]">
								Ведомость зарплаты (Net Revenue)
							</h1>
							<p className="text-xs text-[var(--muted)]">
								Расчёт вознаграждения врачей и ассистентов клиники по фактически оплаченным услугам
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть ведомость"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="flex-1">
					<Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Загрузка ведомости...</div>}>
						<DoctorPayrollReport period="month" />
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export default DirectDoctorPayrollReportLauncher;
