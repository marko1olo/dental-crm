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

const DoctorPayrollModal = lazyWithRetry(() =>
	import("../../../payroll/DoctorPayrollModal").then((module) => ({
		default: module.DoctorPayrollModal,
	})),
);

interface PayrollDoctorOption {
	readonly id: string;
	readonly name: string;
	readonly specialtyId: string;
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
				const data = await res.json();
				const staff: unknown[] = Array.isArray(data) ? data : (data?.staff ?? []);
				const mapped = staff
					.filter((s: any) => s?.role === "doctor" && s?.id && s?.fullName)
					.map((s: any) => ({
						id: String(s.id),
						name: String(s.fullName),
						specialtyId: Array.isArray(s.specialties) && s.specialties[0] ? String(s.specialties[0]) : "general_dentist",
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
		<DoctorPayrollModal
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
