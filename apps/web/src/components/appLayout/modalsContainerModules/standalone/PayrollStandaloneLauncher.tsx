/**
 * PayrollStandaloneLauncher — Автономный запуск ведомости врача (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";
import { DEMO_PAYROLL_SERVICES } from "./demoPayrollServices";

const DoctorPayrollModal = lazyWithRetry(() =>
	import("../../../payroll/DoctorPayrollModal").then((module) => ({
		default: module.DoctorPayrollModal,
	})),
);

export function renderPayrollLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	if (!isDemoShowcaseMode()) return null;

	const search = window.location.search || "";
	const hash = window.location.hash || "";
	const isPayrollRoute =
		search.includes("payroll") ||
		hash.includes("payroll") ||
		search.includes("payout");

	if (!isPayrollRoute) return null;

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка расчетной ведомости врача..." />}>
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
				initialDoctorId="doc-voronov"
				initialServices={DEMO_PAYROLL_SERVICES}
				initialBasePercentage={25}
				initialPeriodStart="2026-10-01"
				initialPeriodEnd="2026-10-31"
				doctorsList={[
					{
						id: "doc-voronov",
						name: "Д-р Воронов Алексей Владимирович",
						specialtyId: "general_dentist",
					},
					{
						id: "doc-barabash",
						name: "Д-р Барабаш Светлана Владимировна",
						specialtyId: "therapist",
					},
				]}
			/>
		</Suspense>
	);
}
