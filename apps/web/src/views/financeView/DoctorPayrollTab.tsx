import React from "react";
import type { DoctorPayrollTabProps } from "./payrollTabModules/types";
import { PayrollTabHeader } from "./payrollTabModules/PayrollTabHeader";
import { PayrollStatCards } from "./payrollTabModules/PayrollStatCards";
import { PayrollChecksTable } from "./payrollTabModules/PayrollChecksTable";
import { PayrollChecksMobileCards } from "./payrollTabModules/PayrollChecksMobileCards";
import { useDoctorPayrollTabData } from "./payrollTabModules/useDoctorPayrollTabData";

export function DoctorPayrollTab({
	clinicName,
	doctorsList,
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
		fetchError,
		retryFetch,
		calculationResult,
		handleExportCsv,
		handlePrintPayslip,
		doctors,
	} = useDoctorPayrollTabData({ clinicName, doctorsList, services });

	const paidServicesCount = effectiveServices.filter(
		(s) => s.isPaid !== false && !s.isDebt && s.invoiceStatus !== "unpaid"
	).length;

	return (
		<div className="flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-150" data-testid="doctor-payroll-tab">
			<PayrollTabHeader
				doctorsList={doctors}
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

			{fetchError && (
				<div className="p-3.5 rounded-xl border border-[var(--danger,#ef4444)]/30 bg-[var(--danger-soft,rgba(239,68,68,0.08))] text-[var(--ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-[var(--danger,#ef4444)] font-bold">⚠️</span>
						<span>{fetchError}</span>
					</div>
					<button
						type="button"
						onClick={retryFetch}
						className="h-8 px-3 rounded-lg text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] shrink-0 transition-colors"
					>
						Повторить загрузку начислений
					</button>
				</div>
			)}

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
