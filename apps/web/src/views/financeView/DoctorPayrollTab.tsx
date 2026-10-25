import React from "react";
import type { DoctorPayrollTabProps } from "./payrollTabModules/types";
import { PayrollTabHeader } from "./payrollTabModules/PayrollTabHeader";
import { PayrollStatCards } from "./payrollTabModules/PayrollStatCards";
import { PayrollChecksTable } from "./payrollTabModules/PayrollChecksTable";
import { PayrollChecksMobileCards } from "./payrollTabModules/PayrollChecksMobileCards";
import { useDoctorPayrollTabData, DEFAULT_DOCTORS } from "./payrollTabModules/useDoctorPayrollTabData";

export function DoctorPayrollTab({
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = DEFAULT_DOCTORS,
	services = [],
}: DoctorPayrollTabProps): React.JSX.Element {
	const {
		selectedDoctorId,
		setSelectedDoctorId,
		periodStart,
		setPeriodStart,
		periodEnd,
		setPeriodEnd,
		effectiveServices,
		isLoading,
		calculationResult,
		handleExportCsv,
		handlePrintPayslip,
	} = useDoctorPayrollTabData({ clinicName, doctorsList, services });

	const paidServicesCount = effectiveServices.filter(
		(s) => s.isPaid !== false && !s.isDebt && s.invoiceStatus !== "unpaid"
	).length;

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
					{paidServicesCount} чеков
				</span>
			</div>

			<PayrollChecksTable services={effectiveServices} commissionPercent={calculationResult.baseCommissionPercent} />
			<PayrollChecksMobileCards services={effectiveServices} commissionPercent={calculationResult.baseCommissionPercent} />
		</div>
	);
}
