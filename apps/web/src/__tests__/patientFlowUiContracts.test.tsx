import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { getFilteredAppViews } from "../utils/routeUtils";
import {
	AnalyticsHeaderBar,
	resolveAnalyticsHeaderVisibility,
} from "../pages/analyticsDashboard/AnalyticsHeaderBar";
import {
	ExecutiveDashboard,
	resolveExecutiveDashboardVisibility,
} from "../components/analytics/ExecutiveDashboard";
import {
	PatientCardModal,
	resolvePatientCardVisibleTabs,
} from "../components/patients/PatientCardModal";

describe("12-Role RBAC & solo_doctor 7-Point Isolation Contracts (§5)", () => {
	it("getFilteredAppViews hides analytics/P&L from admin/registrar/curator and unlocks finance+analytics for solo_doctor", () => {
		for (const role of ["admin", "administrator", "senior_admin", "registrar", "curator"] as const) {
			const views = getFilteredAppViews(role, { clinicMode: "small_clinic" });
			assert.equal(
				views.includes("analytics"),
				false,
				`Role ${role} must NOT expose analytics P&L view by default`,
			);
		}

		const standardDocViews = getFilteredAppViews("doctor", { clinicMode: "small_clinic" });
		assert.equal(standardDocViews.includes("analytics"), false);
		assert.equal(standardDocViews.includes("finance"), false);

		const soloDocViews = getFilteredAppViews("doctor", { clinicMode: "solo_doctor", isSoloDoctor: true });
		assert.equal(soloDocViews.includes("finance"), true);
		assert.equal(soloDocViews.includes("analytics"), true);

		const ownerViews = getFilteredAppViews("owner", { clinicMode: "small_clinic" });
		assert.equal(ownerViews.includes("analytics"), true);
		assert.equal(ownerViews.includes("finance"), true);
	});

	it("AnalyticsHeaderBar hides branches, curators and marketing ROMI in solo_doctor vs network_clinic and renders header cleanly", () => {
		const soloVis = resolveAnalyticsHeaderVisibility({
			clinicMode: "solo_doctor",
			selectedWorkspaceRole: "doctor",
			hasLeadsKanban: true,
			hasMarketingModule: true,
			hasMultipleChairs: true,
		});
		assert.equal(soloVis.showCurators, false);
		assert.equal(soloVis.showMarketing, false);
		assert.equal(soloVis.showBranches, false);
		assert.equal(soloVis.showPnl, true);

		const adminVis = resolveAnalyticsHeaderVisibility({
			clinicMode: "small_clinic",
			selectedWorkspaceRole: "administrator",
			hasLeadsKanban: true,
			hasMarketingModule: true,
			hasMultipleChairs: true,
		});
		assert.equal(adminVis.showCurators, true);
		assert.equal(adminVis.showMarketing, true);
		assert.equal(adminVis.showBranches, true);
		assert.equal(adminVis.showPnl, false, "administrator must NOT see P&L analytics action");

		const html = renderToString(
			React.createElement(AnalyticsHeaderBar, {
				updatedAt: null,
				dateRange: "month",
				setDateRange: () => {},
				branchFilter: "all",
				setBranchFilter: () => {},
				analyticsSection: "executive",
				setAnalyticsSection: () => {},
				loading: false,
				onExportCsv: () => {},
				onRetry: () => {},
				onOpenMarketingRoi: () => {},
				onOpenFinancialAnalytics: () => {},
				onOpenExecutiveStudio: () => {},
			}),
		);
		assert.ok(html.includes("Аналитика"));
	});

	it("ExecutiveDashboard hides Doctor Payroll tab in solo_doctor while keeping P&L button for solo_doctor and renders cleanly", () => {
		const clinicOwnerVis = resolveExecutiveDashboardVisibility({
			clinicMode: "small_clinic",
			selectedWorkspaceRole: "owner",
			hasPayrollModule: true,
			hasMultipleChairs: true,
		});
		assert.equal(clinicOwnerVis.showPayrollTab, true);
		assert.equal(clinicOwnerVis.showChairsTab, true);
		assert.equal(clinicOwnerVis.showPnlButton, true);

		const soloVis = resolveExecutiveDashboardVisibility({
			clinicMode: "solo_doctor",
			selectedWorkspaceRole: "doctor",
			hasPayrollModule: true,
			hasMultipleChairs: false,
		});
		assert.equal(soloVis.showPayrollTab, false);
		assert.equal(soloVis.showChairsTab, false);
		assert.equal(soloVis.showPnlButton, true);

		const adminVis = resolveExecutiveDashboardVisibility({
			clinicMode: "small_clinic",
			selectedWorkspaceRole: "administrator",
			hasPayrollModule: true,
			hasMultipleChairs: true,
		});
		assert.equal(adminVis.showPayrollTab, false);
		assert.equal(adminVis.showPnlButton, false);

		const html = renderToString(React.createElement(ExecutiveDashboard, { period: "month" }));
		assert.ok(html.includes('data-testid="executive-dashboard-root"'));
	});

	it("PatientCardModal hides labOrders and reclamations tabs when workspace feature flags disable them", () => {
		const enabledIds = resolvePatientCardVisibleTabs({
			hasDentalLab: true,
			hasReclamations: true,
			isDemo: false,
		}).map((t) => t.id);
		assert.ok(enabledIds.includes("labOrders"));
		assert.ok(enabledIds.includes("reclamations"));

		const disabledIds = resolvePatientCardVisibleTabs({
			hasDentalLab: false,
			hasReclamations: false,
			isDemo: false,
		}).map((t) => t.id);
		assert.equal(disabledIds.includes("labOrders"), false);
		assert.equal(disabledIds.includes("reclamations"), false);
		assert.ok(disabledIds.includes("general"));

		const html = renderToString(
			React.createElement(PatientCardModal, {
				isOpen: true,
				isOverlayHosted: true,
				mode: "view",
				patientId: "pat-solo-1",
				patient: {
					id: "pat-solo-1",
					fullName: "Смирнов Игорь Васильевич",
					phone: "+7 999 000-11-22",
				},
				onClose: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="tab-patient-general"'));
	});
});
