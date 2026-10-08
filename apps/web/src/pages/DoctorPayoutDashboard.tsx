import React from "react";
import { DoctorPayrollModal } from "../components/finance/payroll/DoctorPayrollModal";
import { useIsMobile } from "../hooks/useIsMobile";
import { DoctorPayoutMobileWallet } from "../components/finance/DoctorPayoutMobileWallet";
import "../styles/dente-operations.css";

import type { DoctorPayoutDashboardProps } from "./payoutDashboard/types";
import {
	doctorServicesForPayrollModal,
	mapRoleToSpecialtyId,
} from "./payoutDashboard/payoutHelpers";
import { usePayoutDashboard } from "./payoutDashboard/usePayoutDashboard";
import { PayoutDashboardHeader } from "./payoutDashboard/PayoutDashboardHeader";
import { PayoutSummaryCards } from "./payoutDashboard/PayoutSummaryCards";
import { PayoutDoctorTable } from "./payoutDashboard/PayoutDoctorTable";

export type {
	DoctorPayoutVisitService,
	DoctorPayoutVisitMaterial,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
	DoctorPayoutRow,
	DoctorPayoutTotals,
	DoctorPayoutReport,
	DoctorPayoutDashboardProps,
} from "./payoutDashboard/types";

export {
	payoutMonthCalendarBounds,
	requestDoctorPayouts,
	mapRoleToSpecialtyId,
	inferServiceCategory,
	doctorServicesForPayrollModal,
} from "./payoutDashboard/payoutHelpers";

export function DoctorPayoutDashboard({ initialReport }: DoctorPayoutDashboardProps = {}) {
	const isMobile = useIsMobile(768);
	const {
		month,
		setMonth,
		state,
		load,
		report,
		isOwnScope,
		canEditRates,
		ownVisible,
		monthLabel,
		editingRateFor,
		rateDraft,
		setRateDraft,
		rateSave,
		saveRate,
		handleStartEditRate,
		handleCancelEditRate,
		expandedDoctorId,
		handleToggleExpandDoctor,
		activeSubTabs,
		handleSubTabChange,
		searchFilters,
		handleSearchChange,
		visitPages,
		handlePageChange,
		payrollModalDoctor,
		setPayrollModalDoctor,
	} = usePayoutDashboard(initialReport);

	// Роль отказала — блока нет вовсе, вместе с заголовком.
	if (state.kind === "denied") return null;

	if (isMobile) {
		if (state.kind === "needs_staff_login") {
			return (
				<div className="doctor-wallet-container">
					<h3 className="doctor-wallet-title">Выплаты врачам</h3>
					<p className="ops-notice" role="status">
						Выплаты не показаны: нет входа сотрудника. {state.message} Войдите в
						рабочий кабинет клиники и подтвердите себя PIN-кодом — после этого
						расчёт откроется.
					</p>
				</div>
			);
		}
		if (state.kind === "failed") {
			return (
				<div className="doctor-wallet-container">
					<h3 className="doctor-wallet-title">Выплаты врачам</h3>
					<p className="ops-notice ops-notice--error" role="alert">
						Расчёт выплат за {monthLabel} не выполнен. {state.message} {state.action}
					</p>
				</div>
			);
		}
		return (
			<>
				<DoctorPayoutMobileWallet
					report={report}
					month={month}
					onMonthChange={setMonth}
					onRefresh={() => void load(month)}
					onOpenPayrollModal={(doc) => setPayrollModalDoctor(doc)}
					canEditRates={canEditRates}
					isLoading={state.kind === "loading"}
				/>
				{payrollModalDoctor ? (
					<DoctorPayrollModal
						isOpen={Boolean(payrollModalDoctor)}
						onClose={() => setPayrollModalDoctor(null)}
						initialDoctorId={payrollModalDoctor.doctorUserId}
						initialServices={doctorServicesForPayrollModal(payrollModalDoctor)}
						initialBasePercentage={payrollModalDoctor.commissionPct ?? undefined}
						initialPeriodStart={report?.period ? report.period.from.slice(0, 10) : undefined}
						initialPeriodEnd={report?.period ? report.period.to.slice(0, 10) : undefined}
						doctorsList={[
							{
								id: payrollModalDoctor.doctorUserId,
								name: payrollModalDoctor.doctorName,
								specialtyId: mapRoleToSpecialtyId(payrollModalDoctor.role),
							},
						]}
					/>
				) : null}
			</>
		);
	}

	return (
		<>
			<PayoutDashboardHeader
				month={month}
				onMonthChange={setMonth}
				onRefresh={() => void load(month)}
				isLoading={state.kind === "loading"}
				state={state}
				monthLabel={monthLabel}
			/>

			{report ? (
				<>
					<PayoutDoctorTable
						report={report}
						isOwnScope={isOwnScope}
						monthLabel={monthLabel}
						canEditRates={canEditRates}
						editingRateFor={editingRateFor}
						rateDraft={rateDraft}
						rateSave={rateSave}
						onStartEditRate={handleStartEditRate}
						onCancelEditRate={handleCancelEditRate}
						onRateDraftChange={setRateDraft}
						onSaveRate={saveRate}
						expandedDoctorId={expandedDoctorId}
						onToggleExpandDoctor={handleToggleExpandDoctor}
						activeSubTabs={activeSubTabs}
						onSubTabChange={handleSubTabChange}
						searchFilters={searchFilters}
						onSearchChange={handleSearchChange}
						visitPages={visitPages}
						onPageChange={handlePageChange}
						onOpenPayrollModal={(doc) => setPayrollModalDoctor(doc)}
					/>

					<PayoutSummaryCards
						report={report}
						isOwnScope={isOwnScope}
						ownVisible={ownVisible}
						canEditRates={canEditRates}
					/>
				</>
			) : null}

			{payrollModalDoctor ? (
				<DoctorPayrollModal
					isOpen={Boolean(payrollModalDoctor)}
					onClose={() => setPayrollModalDoctor(null)}
					initialDoctorId={payrollModalDoctor.doctorUserId}
					initialServices={doctorServicesForPayrollModal(payrollModalDoctor)}
					initialBasePercentage={payrollModalDoctor.commissionPct ?? undefined}
					initialPeriodStart={report?.period ? report.period.from.slice(0, 10) : undefined}
					initialPeriodEnd={report?.period ? report.period.to.slice(0, 10) : undefined}
					doctorsList={[
						{
							id: payrollModalDoctor.doctorUserId,
							name: payrollModalDoctor.doctorName,
							specialtyId: mapRoleToSpecialtyId(payrollModalDoctor.role),
						},
					]}
				/>
			) : null}
		</>
	);
}

export default DoctorPayoutDashboard;
