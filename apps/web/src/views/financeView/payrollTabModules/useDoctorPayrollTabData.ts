import { useState, useMemo, useEffect } from "react";
import { calculateDoctorPeriodPayroll, type DoctorCompletedServiceItem, type DoctorPayrollResult } from "@dental/shared/payroll";
import type { PayrollDoctorOption } from "./types";
import { fetchDoctorEarningsWithStatusApi } from "../../../components/payroll/fetchDoctorEarningsApi";
import { exportDoctorPayrollCsv, printDoctorPayslipHtml } from "./payrollTabExportUtils";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";

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
	readonly fetchError: string | null;
	readonly retryFetch: () => void;
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
	const brandingClinicName = useDocumentBrandingStore((s) => s.clinicName);
	const effectiveClinicName = clinicName || brandingClinicName || "Стоматологическая клиника";
	const [apiDoctors, setApiDoctors] = useState<readonly PayrollDoctorOption[]>([]);

	useEffect(() => {
		if (doctorsList && doctorsList.length > 0) return;
		let cancelled = false;
		fetch("/api/v1/doctors", {
			headers: denteClinicalReadHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					clientLogger.warn("[useDoctorPayrollTabData] Failed to load doctors HTTP status", { status: res.status }, { module: "Payroll" });
					return null;
				}
				return res.json();
			})
			.then((raw) => {
				const data = raw && typeof raw === "object" && "data" in raw ? (raw as { data?: unknown }).data ?? raw : raw;
				const rawDoctors =
					Array.isArray((data as { doctors?: unknown[] } | null)?.doctors)
						? (data as { doctors: Record<string, unknown>[] }).doctors
						: Array.isArray(data)
							? (data as Record<string, unknown>[])
							: null;
				if (cancelled || !rawDoctors) return;
				const mapped: PayrollDoctorOption[] = rawDoctors.map((d: Record<string, unknown>) => ({
					id: String(d["id"] ?? ""),
					name: String(d["name"] || "Врач-стоматолог"),
					specialtyId: String(d["specialtyId"] || "general_dentist"),
				}));
				if (mapped.length > 0) {
					setApiDoctors(mapped);
					setSelectedDoctorId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id ?? ""));
				}
			})
			.catch((err) => {
				clientLogger.error("[useDoctorPayrollTabData] Failed to load doctors", err, { module: "Payroll" });
			});
		return () => {
			cancelled = true;
		};
	}, [doctorsList]);

	const doctors = useMemo<readonly PayrollDoctorOption[]>(() => {
		if (doctorsList && doctorsList.length > 0) return doctorsList;
		if (apiDoctors.length > 0) return apiDoctors;
		return [];
	}, [doctorsList, apiDoctors]);

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
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [fetchTrigger, setFetchTrigger] = useState<number>(0);

	const retryFetch = () => setFetchTrigger((prev) => prev + 1);

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
		setFetchError(null);

		fetchDoctorEarningsWithStatusApi({
			doctorId: activeDoctor.id,
			periodStart,
			periodEnd,
			payoutModel: "percentage",
			chairRentalRub: 0,
			advanceRub: 0,
			taxRegime: "employee",
		})
			.then((res) => {
				if (!isCancelled) {
					setApiServices(res.services);
					setIsLoading(false);
					setFetchError(null);
				}
			})
			.catch((err) => {
				clientLogger.error("[useDoctorPayrollTabData] Failed to load doctor earnings", err, { module: "Payroll" });
				if (!isCancelled) {
					setIsLoading(false);
					setFetchError("Не удалось загрузить начисления врача из базы данных");
				}
			});

		return () => { isCancelled = true; };
	}, [services, activeDoctor.id, periodStart, periodEnd, fetchTrigger]);

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
		fetchError,
		retryFetch,
		calculationResult,
		handleExportCsv,
		handlePrintPayslip,
		doctors,
	};
}
