/**
 * PayrollStandaloneLauncher — Автономный запуск ведомости врача (Мандат 8b, <= 120 строк).
 *
 * Честный контур: список врачей грузится из /api/settings/staff, заработки за период
 * модалка тянет сама из /api/doctor/my-earnings. Никаких вбитых врачей, пациентов,
 * сумм и процентов — deep-link только открывает ведомость с живыми данными.
 */

import React, { Suspense, useEffect, useState } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";
import { DirectDoctorPayrollReportLauncher } from "../../../analytics/DirectDoctorPayrollReportLauncher";

const DoctorPayrollStudioModal = lazyWithRetry(() =>
	import("../../../payroll/DoctorPayrollStudioModal").then((module) => ({
		default: module.DoctorPayrollStudioModal,
	})),
);

interface PayrollDoctorOption {
	readonly id: string;
	readonly name: string;
	readonly specialtyId: string;
}

interface RawStaffItem {
	readonly id?: string;
	readonly fullName?: string;
	readonly role?: string;
	readonly specialties?: readonly string[];
}

function useRealDoctors(): PayrollDoctorOption[] {
	const [doctors, setDoctors] = useState<PayrollDoctorOption[]>([]);
	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch("/api/settings/staff", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = (await res.json()) as { staff?: readonly RawStaffItem[] } | readonly RawStaffItem[];
				const staff: readonly RawStaffItem[] = Array.isArray(data)
					? data
					: (data && "staff" in data && Array.isArray(data.staff) ? data.staff : []);
				const mapped: PayrollDoctorOption[] = staff
					.filter((s): s is RawStaffItem & { id: string; fullName: string } => s?.role === "doctor" && typeof s?.id === "string" && typeof s?.fullName === "string")
					.map((s) => ({
						id: s.id,
						name: s.fullName,
						specialtyId: Array.isArray(s.specialties) && typeof s.specialties[0] === "string" ? s.specialties[0] : "general_dentist",
					}));
				if (!cancelled) setDoctors(mapped);
			} catch {
				// Список не загрузился — модалка работает в соло-режиме по умолчанию.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	return doctors;
}

function PayrollLauncherHost() {
	const doctors = useRealDoctors();
	return (
		<DoctorPayrollStudioModal
			isOpen={true}
			onClose={() => {
				const url = new URL(window.location.href);
				url.searchParams.delete("payroll");
				url.searchParams.delete("payout");
				window.history.replaceState(
					{},
					"",
					url.pathname +
						(url.search ? url.search : "") +
						(url.hash && !url.hash.includes("payroll") ? url.hash : ""),
				);
			}}
			doctorsList={doctors}
			initialDoctorId={doctors[0]?.id}
		/>
	);
}

export function renderPayrollLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;

	const search = window.location.search || "";
	const hash = window.location.hash || "";

	// Сводная ведомость Net Revenue и зарплаты ассистентов (DoctorPayrollReport)
	if (
		hash.includes("doctor-payroll-report") ||
		hash.includes("executive-payroll") ||
		hash.includes("assistant-payroll") ||
		search.includes("doctor_payroll") ||
		search.includes("executive_payroll") ||
		search.includes("assistant_payroll")
	) {
		return <DirectDoctorPayrollReportLauncher />;
	}

	const isPayrollRoute =
		search.includes("payroll") ||
		hash.includes("payroll") ||
		search.includes("payout");

	if (!isPayrollRoute) return null;

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка расчетной ведомости врача..." />}>
			<PayrollLauncherHost />
		</Suspense>
	);
}
