import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";
import type { DoctorCompletedServiceItem } from "@dental/shared/finance";

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

	const demoServices: DoctorCompletedServiceItem[] = [
		{
			id: "srv-101",
			dateIso: "2026-10-12",
			patientName: "Смирнова Екатерина Васильевна",
			medicalCardNumber: "К-0482",
			serviceNameRu: "Прием (осмотр, консультация) врача-стоматолога первичный",
			category: "therapy",
			order804nCode: "A01.07.001",
			grossRevenueKop: 250000,
			isPaid: true,
			paidAmountKop: 250000,
			fiscalReceiptNumber: "ФД-10492",
			labCostKop: 0,
			materialCostKop: 0,
			performerId: "doc-voronov",
			doctorId: "doc-voronov",
		},
		{
			id: "srv-102",
			dateIso: "2026-10-15",
			patientName: "Смирнова Екатерина Васильевна",
			medicalCardNumber: "К-0482",
			serviceNameRu: "Восстановление зуба пломбой (глубокий кариес, Filtek Ultimate)",
			category: "therapy",
			order804nCode: "A16.07.002",
			toothCode: "3.6",
			grossRevenueKop: 850000,
			isPaid: true,
			paidAmountKop: 850000,
			fiscalReceiptNumber: "ФД-10512",
			labCostKop: 0,
			materialCostKop: 60000,
			performerId: "doc-voronov",
			doctorId: "doc-voronov",
		},
		{
			id: "srv-103",
			dateIso: "2026-10-18",
			patientName: "Михайлов Артем Евгеньевич",
			medicalCardNumber: "К-0319",
			serviceNameRu: "Восстановление зуба коронкой металлокерамической Duceram Plus",
			category: "orthopedics",
			order804nCode: "A16.07.004",
			toothCode: "4.6",
			grossRevenueKop: 2200000,
			isPaid: true,
			paidAmountKop: 2200000,
			fiscalReceiptNumber: "ФД-10580",
			labCostKop: 700000,
			materialCostKop: 120000,
			performerId: "doc-voronov",
			doctorId: "doc-voronov",
		},
		{
			id: "srv-104",
			dateIso: "2026-10-22",
			patientName: "Ковалев Дмитрий Сергеевич",
			medicalCardNumber: "К-0511",
			serviceNameRu: "Внутрикостная дентальная имплантация Nobel Biocare Parallel CC",
			category: "surgery",
			order804nCode: "A16.07.054",
			toothCode: "2.4",
			grossRevenueKop: 4500000,
			isPaid: false,
			paidAmountKop: 0,
			labCostKop: 0,
			materialCostKop: 1500000,
			performerId: "doc-voronov",
			doctorId: "doc-voronov",
		},
		{
			id: "srv-105",
			dateIso: "2026-10-25",
			patientName: "Федорова Анна Павловна",
			medicalCardNumber: "К-0274",
			serviceNameRu: "Профессиональная гигиена полости рта и зубов (AirFlow + ультразвук)",
			category: "hygiene",
			order804nCode: "A16.07.051",
			grossRevenueKop: 600000,
			isPaid: true,
			paidAmountKop: 300000,
			fiscalReceiptNumber: "ФД-10645",
			labCostKop: 0,
			materialCostKop: 50000,
			performerId: "doc-voronov",
			doctorId: "doc-voronov",
		},
	];

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
				initialServices={demoServices}
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
