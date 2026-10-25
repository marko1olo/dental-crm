import { useState, useMemo, useEffect } from "react";
import { calculateDoctorPeriodPayroll, type DoctorCompletedServiceItem, type DoctorPayrollResult } from "@dental/shared/payroll";
import type { PayrollDoctorOption } from "./types";
import { mapEarningsApiServices } from "./mapEarningsApiServices";
import { exportDoctorPayrollCsv, printDoctorPayslipHtml } from "./payrollTabExportUtils";

export const DEFAULT_DOCTORS: readonly PayrollDoctorOption[] = [
	{ id: "doc-1", name: "Д-р Смирнов А.В.", specialtyId: "general_dentist" },
	{ id: "doc-2", name: "Д-р Кузнецова Е.И.", specialtyId: "therapist" },
	{ id: "doc-3", name: "Д-р Васильев Д.М.", specialtyId: "orthopedist" },
	{ id: "doc-4", name: "Д-р Орлов С.П.", specialtyId: "surgeon_implantologist" },
];

export interface UseDoctorPayrollTabDataParams {
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly PayrollDoctorOption[] | undefined;
	readonly services?: readonly DoctorCompletedServiceItem[] | undefined;
}

export interface UseDoctorPayrollTabDataReturn {
	readonly selectedDoctorId: string;
	readonly setSelectedDoctorId: (id: string) => void;
	readonly periodStart: string;
	readonly setPeriodStart: (val: string) => void;
	readonly periodEnd: string;
	readonly setPeriodEnd: (val: string) => void;
	readonly activeDoctor: PayrollDoctorOption;
	readonly effectiveServices: readonly DoctorCompletedServiceItem[];
	readonly isLoading: boolean;
	readonly calculationResult: DoctorPayrollResult;
	readonly handleExportCsv: () => void;
	readonly handlePrintPayslip: () => void;
}

export function useDoctorPayrollTabData({
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = DEFAULT_DOCTORS,
	services = [],
}: UseDoctorPayrollTabDataParams): UseDoctorPayrollTabDataReturn {
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorsList[0]?.id || "doc-1");
	const [periodStart, setPeriodStart] = useState<string>(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	});
	const [periodEnd, setPeriodEnd] = useState<string>(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth();
		const lastDay = String(new Date(y, m + 1, 0).getDate()).padStart(2, "0");
		return `${y}-${String(m + 1).padStart(2, "0")}-${lastDay}`;
	});

	const [apiServices, setApiServices] = useState<DoctorCompletedServiceItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const activeDoctor = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0] || DEFAULT_DOCTORS[0]!;

	useEffect(() => {
		if (services && services.length > 0) return;
		let isCancelled = false;
		setIsLoading(true);

		const query = new URLSearchParams({ doctorId: activeDoctor.id, from: periodStart, to: periodEnd });
		fetch(`/api/doctor/my-earnings?${query.toString()}`)
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
			.then((data) => {
				if (!isCancelled) {
					setApiServices(mapEarningsApiServices(data, activeDoctor.id, periodStart));
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (!isCancelled) setIsLoading(false);
			});

		return () => { isCancelled = true; };
	}, [services, activeDoctor.id, periodStart, periodEnd]);

	const effectiveServices = useMemo(
		() => (services && services.length > 0 ? services : apiServices),
		[services, apiServices]
	);

	const calculationResult = useMemo(
		() => calculateDoctorPeriodPayroll({
			doctorId: activeDoctor.id,
			doctorName: activeDoctor.name,
			specialtyId: activeDoctor.specialtyId,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			services: effectiveServices,
		}),
		[activeDoctor, periodStart, periodEnd, effectiveServices]
	);

	const handleExportCsv = () => exportDoctorPayrollCsv(calculationResult, activeDoctor.name, periodStart, periodEnd);
	const handlePrintPayslip = () => printDoctorPayslipHtml(calculationResult, clinicName);

	return {
		selectedDoctorId,
		setSelectedDoctorId,
		periodStart,
		setPeriodStart,
		periodEnd,
		setPeriodEnd,
		activeDoctor,
		effectiveServices,
		isLoading,
		calculationResult,
		handleExportCsv,
		handlePrintPayslip,
	};
}
