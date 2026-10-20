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
import { useDocumentBrandingStore } from "../store/documentBrandingStore";
import { useOptionalAppLogicContext } from "../contexts/AppLogicContext";

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
	const branding = useDocumentBrandingStore((s) => s.branding);
	const appLogic = useOptionalAppLogicContext();
	const resolvedClinicName = branding?.clinicName
		|| branding?.legalEntityName
		|| appLogic?.dashboard?.organization?.name
		|| appLogic?.dashboard?.clinicSettings?.clinicName
		|| "";

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

	const [isPayrollModalOpen, setIsPayrollModalOpen] = React.useState<boolean>(false);

	const allReportDoctors = React.useMemo(() => {
		if (!report?.doctors) return [];
		return report.doctors.map((d) => ({
			id: d.doctorUserId,
			name: d.doctorName,
			specialtyId: mapRoleToSpecialtyId(d.role),
		}));
	}, [report?.doctors]);

	React.useEffect(() => {
		const handleOpenPayroll = (e: Event) => {
			const customEvent = e as CustomEvent;
			const passedDoctor = customEvent.detail?.doctor;
			const passedDoctorId = customEvent.detail?.doctorId;

			if (passedDoctor && (passedDoctor.doctorUserId || passedDoctor.id)) {
				setPayrollModalDoctor(passedDoctor);
				setIsPayrollModalOpen(true);
				return;
			}

			if (passedDoctorId && report?.doctors) {
				const found = report.doctors.find((d) => d.doctorUserId === passedDoctorId);
				if (found) {
					setPayrollModalDoctor(found);
					setIsPayrollModalOpen(true);
					return;
				}
			}

			// Если доктор не передан — открываем расчетный лист в честном EmptyState
			setPayrollModalDoctor(null);
			setIsPayrollModalOpen(true);
		};
		window.addEventListener("dente:open-doctor-payroll", handleOpenPayroll);
		return () => window.removeEventListener("dente:open-doctor-payroll", handleOpenPayroll);
	}, [report, setPayrollModalDoctor]);

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
				{showDoctorSelectionNotice && (
					<div
						className="p-4 mb-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-between shadow-sm"
						role="status"
						data-testid="payroll-no-doctor-selected-notice"
					>
						<div className="flex items-center gap-2">
							<span className="text-amber-500 font-bold text-base">ℹ</span>
							<span className="text-sm font-medium">Выберите врача для отображения зарплатной ведомости</span>
						</div>
						<button
							type="button"
							onClick={() => setShowDoctorSelectionNotice(false)}
							className="text-xs px-2.5 py-1 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				)}
				<DoctorPayoutMobileWallet
					report={report}
					month={month}
					onMonthChange={setMonth}
					onRefresh={() => void load(month)}
					onOpenPayrollModal={(doc) => {
						setShowDoctorSelectionNotice(false);
						setPayrollModalDoctor(doc);
					}}
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
			{showDoctorSelectionNotice && (
				<div
					className="p-4 mb-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex items-center justify-between shadow-sm"
					role="status"
					data-testid="payroll-no-doctor-selected-notice"
				>
					<div className="flex items-center gap-2">
						<span className="text-amber-500 font-bold text-base">ℹ</span>
						<span className="text-sm font-medium">Выберите врача для отображения зарплатной ведомости</span>
					</div>
					<button
						type="button"
						onClick={() => setShowDoctorSelectionNotice(false)}
						className="text-xs px-2.5 py-1 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			)}
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
						onOpenPayrollModal={(doc) => {
							setPayrollModalDoctor(doc);
							setIsPayrollModalOpen(true);
						}}
					/>

					<PayoutSummaryCards
						report={report}
						isOwnScope={isOwnScope}
						ownVisible={ownVisible}
						canEditRates={canEditRates}
					/>
				</>
			) : null}

			{isPayrollModalOpen ? (
				<DoctorPayrollModal
					isOpen={isPayrollModalOpen}
					onClose={() => {
						setIsPayrollModalOpen(false);
						setPayrollModalDoctor(null);
					}}
					clinicName={resolvedClinicName}
					initialDoctorId={payrollModalDoctor?.doctorUserId}
					initialServices={payrollModalDoctor ? doctorServicesForPayrollModal(payrollModalDoctor) : undefined}
					initialBasePercentage={payrollModalDoctor?.commissionPct ?? undefined}
					initialPeriodStart={report?.period ? report.period.from.slice(0, 10) : undefined}
					initialPeriodEnd={report?.period ? report.period.to.slice(0, 10) : undefined}
					doctorsList={allReportDoctors.length > 0 ? allReportDoctors : (payrollModalDoctor ? [
						{
							id: payrollModalDoctor.doctorUserId,
							name: payrollModalDoctor.doctorName,
							specialtyId: mapRoleToSpecialtyId(payrollModalDoctor.role),
						},
					] : [])}
				/>
			) : null}
		</>
	);
}

export default DoctorPayoutDashboard;
