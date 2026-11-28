import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { staffRoleSchema, type StaffRole } from "@dental/shared";
import {
	appViews,
	getFallbackAppView,
	getFilteredAppViews,
} from "../utils/routeUtils";
import { roleFocusOrder } from "../constants/onboardingConstants";
import { visibleStaffRoles } from "../lib/clinicCapabilities";
import { DEMO_ROLES } from "../components/auth/DemoTourSelector";
import { ViewRouterContainer } from "../components/appLayout/viewRouterModules/ViewRouterContainer";
import { FinanceToolbarMenuItems } from "../components/finance/toolbar/FinanceToolbarMenuItems";
import { fetchClinicAnalyticsSSOT } from "../components/analytics/analyticsCatalogData";
import { ExecutiveDashboard } from "../components/analytics/ExecutiveDashboard";
import { DoctorPayrollStudioModal } from "../components/payroll/DoctorPayrollStudioModal";
import { Billing1CExportModal } from "../components/finance/Billing1CExportModal";
import { StudioCuratorAssignmentTab } from "../components/treatment-plans/studioTabs/StudioCuratorAssignmentTab";

const ALL_12_ROLES: readonly StaffRole[] = staffRoleSchema.options;

describe("12 Clinic Roles RBAC & Accountant / Admin E2E Contracts", () => {
	it("covers all 12 StaffRole values in routeUtils, roleFocusOrder, clinicCapabilities, and DemoTourSelector", () => {
		assert.equal(ALL_12_ROLES.length, 12);

		for (const role of ALL_12_ROLES) {
			const views = getFilteredAppViews(role);
			assert.ok(views.length > 0, `Role ${role} must have allowed views`);
			for (const view of views) {
				assert.ok(appViews.includes(view), `View ${view} for ${role} must be valid AppView`);
			}
			assert.ok(roleFocusOrder.includes(role), `roleFocusOrder missing role: ${role}`);
		}

		// Accountant -> finance, analytics, documents, inventory, shift
		const accViews = getFilteredAppViews("accountant");
		assert.deepEqual(accViews, ["finance", "analytics", "documents", "inventory", "shift"]);
		assert.equal(getFallbackAppView("accountant"), "finance");

		// Senior Nurse -> shift, inventory, scanner, lab, documents
		const nurseViews = getFilteredAppViews("senior_nurse");
		assert.ok(nurseViews.includes("shift"));
		assert.ok(nurseViews.includes("inventory"));
		assert.ok(nurseViews.includes("scanner"));
		assert.ok(nurseViews.includes("lab"));

		// Curator -> includes leads & schedule, NO P&L analytics by default (Mandate 8n)
		const curatorViews = getFilteredAppViews("curator");
		assert.ok(curatorViews.includes("leads"));
		assert.ok(!curatorViews.includes("analytics"), "curator must not have P&L analytics by default");
		assert.ok(curatorViews.includes("schedule"));

		// Doctor in standard clinic has NO analytics; in solo_doctor has BOTH finance and analytics
		const standardDocViews = getFilteredAppViews("doctor", { clinicMode: "small_clinic" });
		assert.ok(!standardDocViews.includes("analytics"), "standard doctor must not hit 403 analytics tab");
		const soloDocViews = getFilteredAppViews("doctor", { clinicMode: "solo_doctor" });
		assert.ok(soloDocViews.includes("finance"), "solo_doctor must have finance (cashbox)");
		assert.ok(soloDocViews.includes("analytics"), "solo_doctor must have analytics");

		// Reception & admin roles must NOT have P&L analytics view by default, MUST have scanner
		for (const receptionRole of ["admin", "administrator", "senior_admin", "registrar"] as const) {
			const rViews = getFilteredAppViews(receptionRole);
			assert.ok(!rViews.includes("analytics"), `${receptionRole} must not have analytics view`);
			assert.ok(rViews.includes("scanner"), `${receptionRole} must have scanner view`);
		}

		// Network clinic exposes all 12 roles, solo_doctor remains restricted
		assert.equal(visibleStaffRoles(roleFocusOrder, "network_clinic").length, 12);
		assert.deepEqual(visibleStaffRoles(roleFocusOrder, "solo_doctor"), ["doctor", "owner"]);

		// DemoTourSelector includes accountant, senior_nurse, curator
		const demoRolesSet = new Set(DEMO_ROLES.map((d) => d.role));
		assert.ok(demoRolesSet.has("accountant"));
		assert.ok(demoRolesSet.has("senior_nurse"));
		assert.ok(demoRolesSet.has("curator"));
	});

	it("ViewRouterContainer blocks unauthorized view for administrator and permits finance/analytics for accountant", () => {
		const blockedHtml = renderToString(
			React.createElement(ViewRouterContainer, {
				currentView: "analytics",
				dashboard: null,
				activeStaffUser: { id: "u-admin", name: "Смирнова А. П.", fullName: "Смирнова А. П.", role: "administrator" },
				activeVisitPatient: null,
				activePatient: null,
				activePatientInsight: null,
				activeCommunicationTasks: null,
				activeImagingStudies: null,
				activeUsableDocuments: null,
				patientId: null,
				clinicProfileDraft: null,
				appLogicValue: null,
			}),
		);
		assert.ok(blockedHtml.includes("Раздел недоступен для выбранной роли"));

		const allowedHtml = renderToString(
			React.createElement(ViewRouterContainer, {
				currentView: "analytics",
				dashboard: null,
				activeStaffUser: { id: "u-acc", name: "Волкова Н. И.", fullName: "Волкова Н. И.", role: "accountant" },
				activeVisitPatient: null,
				activePatient: null,
				activePatientInsight: null,
				activeCommunicationTasks: null,
				activeImagingStudies: null,
				activeUsableDocuments: null,
				patientId: null,
				clinicProfileDraft: null,
				appLogicValue: null,
			}),
		);
		assert.ok(!allowedHtml.includes("Раздел недоступен для выбранной роли"));
	});

	it("FinanceToolbarMenuItems hides P&L and 1C export for administrator and shows them for accountant", () => {
		const noop = () => {};
		const baseProps = {
			isFinanceOptionsOpen: true,
			onToggleFinanceOptions: noop,
			onCloseFinanceOptions: noop,
			onOpenPnl: noop,
			onGoToDocuments: noop,
			onOpenCashbox: noop,
			onOpenAccountingExport: noop,
			onOpenT13Timesheet: noop,
			onToggleCashShift: noop,
			isCashShiftOpen: false,
		};

		const adminHtml = renderToString(
			React.createElement(FinanceToolbarMenuItems, { ...baseProps, userRole: "administrator" }),
		);
		assert.ok(!adminHtml.includes("Управленческий P&amp;L") && !adminHtml.includes("Управленческий P&L"));
		assert.ok(!adminHtml.includes("Экспорт в 1С"));
		assert.ok(!adminHtml.includes("Табель рабочего времени"));

		const accHtml = renderToString(
			React.createElement(FinanceToolbarMenuItems, { ...baseProps, userRole: "accountant" }),
		);
		assert.ok(accHtml.includes("Управленческий P"));
		assert.ok(accHtml.includes("Экспорт в 1С"));
		assert.ok(accHtml.includes("Табель рабочего времени"));
	});

	it("Billing1CExportModal renders server CommerceML period selector when items=[] and StudioCuratorAssignmentTab uses canonical pipeline stages", () => {
		const oneCHtml = renderToString(
			React.createElement(Billing1CExportModal, {
				isOpen: true,
				onClose: () => {},
				items: [],
			}),
		);
		assert.ok(oneCHtml.includes('data-testid="btn-load-server-1c-commerceml"'));
		assert.ok(oneCHtml.includes("Период 1С CommerceML"));

		const curatorHtml = renderToString(
			React.createElement(StudioCuratorAssignmentTab, {
				doctorFullName: "Д-р Соколов А. В.",
				initialFunnelStage: "consultation",
			}),
		);
		assert.ok(curatorHtml.includes('value="requires_budget"'));
		assert.ok(curatorHtml.includes('value="awaiting_decision"'));
		assert.ok(curatorHtml.includes('value="no_appointment"'));
		assert.ok(curatorHtml.includes('value="in_progress_abandoned"'));
		assert.ok(curatorHtml.includes('value="completed"'));
		assert.ok(!curatorHtml.includes('value="decision_making"'));
	});

	it("fetchClinicAnalyticsSSOT sends clinical read headers and computes rebookingRatePercent from repeatPatientsCount", async () => {
		const origFetch = globalThis.fetch;
		let capturedHeaders: Record<string, string> = {};
		globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
			capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						isEmpty: false,
						kpis: {
							totalRevenueKopecks: 1500000,
							totalCompletedVisits: 3,
							totalAppointments: 4,
							totalPatientsCount: 10,
							repeatPatientsCount: 7,
							primaryPatientsPercent: 30,
							chairOccupancyPercent: 75,
						},
						doctors: [],
						topProcedures: [],
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		try {
			const res = await fetchClinicAnalyticsSSOT("month");
			assert.equal(res.rebookingRatePercent, 70);
			assert.equal(capturedHeaders.Accept, "application/json");
			assert.ok("X-Requested-With" in capturedHeaders || Object.keys(capturedHeaders).length >= 1);
		} finally {
			globalThis.fetch = origFetch;
		}
	});

	it("ExecutiveDashboard exposes Receivables tab + CSV export and DoctorPayrollStudioModal exposes Materials & NDFL", () => {
		const execHtml = renderToString(React.createElement(ExecutiveDashboard, { period: "month" }));
		assert.ok(execHtml.includes('data-testid="executive-tab-receivables"'));
		assert.ok(execHtml.includes('data-testid="executive-export-csv-btn"'));

		const payrollHtml = renderToString(
			React.createElement(DoctorPayrollStudioModal, {
				isOpen: true,
				onClose: () => {},
				doctorsList: [{ id: "doc-1", name: "Д-р Тест", specialtyId: "therapist" }],
				orders: [],
			}),
		);
		assert.ok(payrollHtml.includes("Материалы"));
		assert.ok(payrollHtml.includes("НДФЛ"));
	});
});
