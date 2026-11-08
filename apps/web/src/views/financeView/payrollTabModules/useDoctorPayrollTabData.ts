import { useState, useMemo, useEffect } from "react";
import { calculateDoctorPeriodPayroll, type DoctorCompletedServiceItem, type DoctorPayrollResult } from "@dental/shared/payroll";
import type { PayrollDoctorOption } from "./types";
import { mapEarningsApiServices } from "./mapEarningsApiServices";
import { exportDoctorPayrollCsv, printDoctorPayslipHtml } from "./payrollTabExportUtils";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";

export const DEFAULT_DOCTORS: readonly PayrollDoctorOption[] = [
	{ id: "doc-1", name: "Д-р Смирнов А.В.", specialtyId: "general_dentist" },
	{ id: "doc-2", name: "Д-р Кузнецова Е.И.", specialtyId: "therapist" },
	{ id: "doc-3", name: "Д-р Васильев Д.М.", specialtyId: "orthopedist" },
	{ id: "doc-4", name: "Д-р Орлов С.П.", specialtyId: "surgeon_implantologist" },
];

const EMPTY_DOCTOR: PayrollDoctorOption = {
	id: "",
	name: "Врачи не зарегистрированы",
	specialtyId: "general_dentist",
};

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
	readonly doctors: readonly PayrollDoctorOption[];
}

export function useDoctorPayrollTabData({
	clinicName,
	doctorsList,
	services = [],
}: UseDoctorPayrollTabDataParams): UseDoctorPayrollTabDataReturn {
	const effectiveClinicName = clinicName || useDocumentBrandingStore((s) => s.clinicName) || "Клиника";
	const isDemo = isDemoShowcaseMode();
	const doctors = useMemo<readonly PayrollDoctorOption[]>(() => {
		if (doctorsList && doctorsList.length > 0) return doctorsList;
		if (doctorsList && doctorsList.length === 0) return [];
		return isDemo ? DEFAULT_DOCTORS : [];
	}, [doctorsList, isDemo]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => doctors[0]?.id || "");
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

	const activeDoctor: PayrollDoctorOption = useMemo(() => {
		if (doctors.length === 0) return EMPTY_DOCTOR;
		return doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || EMPTY_DOCTOR;
	}, [doctors, selectedDoctorId]);

	useEffect(() => {
		if (services && services.length > 0) return;
		if (!activeDoctor.id) {
			setApiServices([]);
			return;
		}
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
	const handlePrintPayslip = () => printDoctorPayslipHtml(calculationResult, effectiveClinicName);

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
		doctors,
	};
}
