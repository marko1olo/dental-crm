import React, { useState, useMemo, useEffect } from "react";
import {
	calculateDoctorPeriodPayroll,
	generatePayrollT51Csv,
	type DoctorCompletedServiceItem,
} from "@dental/shared/payroll";
import { generateDoctorPayslipHtml } from "../../components/payroll/staffPayrollEngine";
import type { DoctorPayrollTabProps, PayrollDoctorOption } from "./payrollTabModules/types.js";
import { PayrollTabHeader } from "./payrollTabModules/PayrollTabHeader.js";
import { PayrollStatCards } from "./payrollTabModules/PayrollStatCards.js";
import { PayrollChecksTable } from "./payrollTabModules/PayrollChecksTable.js";
import { PayrollChecksMobileCards } from "./payrollTabModules/PayrollChecksMobileCards.js";

const DEFAULT_DOCTORS: readonly PayrollDoctorOption[] = [
	{ id: "doc-1", name: "Д-р Смирнов А.В.", specialtyId: "general_dentist" },
	{ id: "doc-2", name: "Д-р Кузнецова Е.И.", specialtyId: "therapist" },
	{ id: "doc-3", name: "Д-р Васильев Д.М.", specialtyId: "orthopedist" },
	{ id: "doc-4", name: "Д-р Орлов С.П.", specialtyId: "surgeon_implantologist" },
];

export function DoctorPayrollTab({
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = DEFAULT_DOCTORS,
	services = [],
}: DoctorPayrollTabProps): React.JSX.Element {
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorsList[0]?.id || "doc-1");
	const [periodStart, setPeriodStart] = useState<string>(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		return `${y}-${m}-01`;
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

	const activeDoctor = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[0]!;

	useEffect(() => {
		if (services && services.length > 0) return;
		let isCancelled = false;
		setIsLoading(true);

		const query = new URLSearchParams({
			doctorId: activeDoctor.id,
			from: periodStart,
			to: periodEnd,
		});

		fetch(`/api/doctor/my-earnings?${query.toString()}`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (isCancelled) return;
				const mapped: DoctorCompletedServiceItem[] = [];
				if (data && Array.isArray(data.appointments)) {
					for (const apt of data.appointments) {
						const dateIso = apt.startsAtIso ? apt.startsAtIso.slice(0, 10) : periodStart;
						if (Array.isArray(apt.services) && apt.services.length > 0) {
							for (const srv of apt.services) {
								const cat = [
									"therapy",
									"orthopedics",
									"surgery",
									"orthodontics",
									"hygiene",
									"retail_hygiene",
									"pediatric",
								].includes(srv.category)
									? srv.category
									: "therapy";
								mapped.push({
									id: srv.id || `srv-${apt.appointmentId}-${mapped.length}`,
									dateIso,
									patientName: apt.patientFullName || "Пациент",
									medicalCardNumber: apt.cardNumber || "—",
									serviceNameRu: srv.nameRu || "Стоматологическая процедура",
									category: cat as DoctorCompletedServiceItem["category"],
									grossRevenueKop:
										srv.priceKop ?? Math.round((srv.priceRub || 0) * 100),
									labCostKop:
										srv.labCostKop ?? Math.round((srv.labCostRub || 0) * 100),
									materialCostKop:
										srv.materialCostKop ??
										Math.round((srv.materialCostRub || 0) * 100),
									customCommissionPercent: srv.commissionPercent,
									doctorId: activeDoctor.id,
									performerId: activeDoctor.id,
									isPaid: srv.isPaid !== false && apt.paymentStatus !== "unpaid",
									paidAmountKop:
										srv.paidKop ??
										(srv.isPaid !== false && apt.paymentStatus !== "unpaid"
											? srv.priceKop ?? Math.round((srv.priceRub || 0) * 100)
											: 0),
								});
							}
						}
					}
				}
				setApiServices(mapped);
				setIsLoading(false);
			})
			.catch(() => {
				if (!isCancelled) setIsLoading(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [services, activeDoctor.id, periodStart, periodEnd]);

	const effectiveServices = useMemo(() => {
		return services && services.length > 0 ? services : apiServices;
	}, [services, apiServices]);

	const calculationResult = useMemo(() => {
		return calculateDoctorPeriodPayroll({
			doctorId: activeDoctor.id,
			doctorName: activeDoctor.name,
			specialtyId: activeDoctor.specialtyId,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			services: effectiveServices,
		});
	}, [activeDoctor, periodStart, periodEnd, effectiveServices]);

	const handleExportCsv = () => {
		const csv = generatePayrollT51Csv([calculationResult]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `Расчетный_лист_${activeDoctor.name}_${periodStart}_${periodEnd}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handlePrintPayslip = () => {
		const html = generateDoctorPayslipHtml(calculationResult, clinicName);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			win.print();
		}
	};

	return (
		<div className="flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-150" data-testid="doctor-payroll-tab">
			<PayrollTabHeader
				doctorsList={doctorsList}
				selectedDoctorId={selectedDoctorId}
				onSelectDoctorId={setSelectedDoctorId}
				periodStart={periodStart}
				onPeriodStartChange={setPeriodStart}
				periodEnd={periodEnd}
				onPeriodEndChange={setPeriodEnd}
				specialtyTitle={calculationResult.specialtyTitleRu}
				onExportCsv={handleExportCsv}
				onPrintPayslip={handlePrintPayslip}
			/>

			<PayrollStatCards result={calculationResult} />

			<div className="flex items-center justify-between px-1">
				<h3 className="text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
					<span>Реестр закрытых чеков врача</span>
					{isLoading && (
						<span className="text-[11px] text-[var(--muted)] font-normal italic animate-pulse">
							(загрузка данных из базы...)
						</span>
					)}
				</h3>
				<span className="text-xs text-[var(--muted)] font-mono">
					{effectiveServices.filter((s) => s.isPaid !== false && !s.isDebt && s.invoiceStatus !== "unpaid").length} чеков
				</span>
			</div>

			<PayrollChecksTable services={effectiveServices} commissionPercent={calculationResult.baseCommissionPercent} />
			<PayrollChecksMobileCards services={effectiveServices} commissionPercent={calculationResult.baseCommissionPercent} />
		</div>
	);
}
