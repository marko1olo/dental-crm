/**
 * DoctorPayoutDashboard.tsx — Сдельный расчёт и зарплата врачей (Doctor Earnings & Net Revenue).
 * Mandates 8b, 8e, 8n, 8x.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import "../styles/dente-operations.css";

import type { DoctorPayoutDashboardProps } from "./payoutDashboard/types";
import { usePayoutDashboard } from "./payoutDashboard/usePayoutDashboard";
import { PayoutDashboardHeader } from "./payoutDashboard/PayoutDashboardHeader";
import { PayoutSummaryCards } from "./payoutDashboard/PayoutSummaryCards";
import { PayoutDoctorTable } from "./payoutDashboard/PayoutDoctorTable";
import { DoctorPayoutMobileSection } from "./payoutDashboard/DoctorPayoutMobileSection";
import { DoctorSelectionNotice } from "./payoutDashboard/DoctorSelectionNotice";
import { usePayoutModalEventBridge } from "./payoutDashboard/usePayoutModalEventBridge";
import { PayoutModalWrapper } from "./payoutDashboard/PayoutModalWrapper";
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
	const branding = useDocumentBrandingStore();
	const appLogic = useOptionalAppLogicContext();
	const clinicName = branding?.clinicName || branding?.clinicLegalName || appLogic?.dashboard?.organization?.name || "";

	const dashboard = usePayoutDashboard(initialReport);
	const bridge = usePayoutModalEventBridge(dashboard.report, dashboard.setPayrollModalDoctor);

	if (dashboard.state.kind === "denied") return null;

	if (isMobile) {
		return (
			<DoctorPayoutMobileSection
				state={dashboard.state}
				month={dashboard.month}
				monthLabel={dashboard.monthLabel}
				report={dashboard.report}
				canEditRates={dashboard.canEditRates}
				onMonthChange={dashboard.setMonth}
				onRefresh={() => void dashboard.load(dashboard.month)}
				payrollModalDoctor={dashboard.payrollModalDoctor}
				setPayrollModalDoctor={dashboard.setPayrollModalDoctor}
				showNotice={bridge.showNotice}
				onCloseNotice={() => bridge.setShowNotice(false)}
			/>
		);
	}

	return (
		<>
			{bridge.showNotice && <DoctorSelectionNotice onClose={() => bridge.setShowNotice(false)} />}
			<PayoutDashboardHeader
				month={dashboard.month}
				onMonthChange={dashboard.setMonth}
				onRefresh={() => void dashboard.load(dashboard.month)}
				isLoading={dashboard.state.kind === "loading"}
				state={dashboard.state}
				monthLabel={dashboard.monthLabel}
			/>

			{dashboard.report && (
				<>
					<PayoutDoctorTable
						report={dashboard.report}
						isOwnScope={dashboard.isOwnScope}
						monthLabel={dashboard.monthLabel}
						canEditRates={dashboard.canEditRates}
						editingRateFor={dashboard.editingRateFor}
						rateDraft={dashboard.rateDraft}
						rateSave={dashboard.rateSave}
						onStartEditRate={dashboard.handleStartEditRate}
						onCancelEditRate={dashboard.handleCancelEditRate}
						onRateDraftChange={dashboard.setRateDraft}
						onSaveRate={dashboard.saveRate}
						expandedDoctorId={dashboard.expandedDoctorId}
						onToggleExpandDoctor={dashboard.handleToggleExpandDoctor}
						activeSubTabs={dashboard.activeSubTabs}
						onSubTabChange={dashboard.handleSubTabChange}
						searchFilters={dashboard.searchFilters}
						onSearchChange={dashboard.handleSearchChange}
						visitPages={dashboard.visitPages}
						onPageChange={dashboard.handlePageChange}
						onOpenPayrollModal={(doc) => {
							dashboard.setPayrollModalDoctor(doc);
							bridge.setIsPayrollModalOpen(true);
						}}
					/>
					<PayoutSummaryCards
						report={dashboard.report}
						isOwnScope={dashboard.isOwnScope}
						ownVisible={dashboard.ownVisible}
						canEditRates={dashboard.canEditRates}
					/>
				</>
			)}

			<PayoutModalWrapper
				isOpen={bridge.isPayrollModalOpen}
				onClose={() => { bridge.setIsPayrollModalOpen(false); dashboard.setPayrollModalDoctor(null); }}
				clinicName={clinicName}
				doctor={dashboard.payrollModalDoctor}
				report={dashboard.report}
				allReportDoctors={bridge.allReportDoctors}
			/>
		</>
	);
}

export default DoctorPayoutDashboard;
