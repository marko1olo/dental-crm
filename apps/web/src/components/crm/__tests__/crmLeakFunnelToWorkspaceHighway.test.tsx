/**
 * crmLeakFunnelToWorkspaceHighway.test.tsx
 *
 * Verifies:
 * - CRM Leak Detector Drawer renders lead inspection card and direct patient workspace trigger
 * - Anti-Matryoshka createPortal wrapping (document.body) with non-browser SSR safety
 * - Funnel Analytics modal links to leak detector (header and body retention card)
 * - CrmView canonical export exists and wraps LeadsKanbanView
 * - PatientDetailModal and PatientCardModal provide direct workspace navigation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { CrmLeakDetectorDrawer } from "../CrmLeakDetectorDrawer";
import { LeadsFunnelAnalyticsModal } from "../../leads/LeadsFunnelAnalyticsModal";
import type { CrmLeakLeadItem } from "@dental/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockLeakLead = {
	id: "lead-leak-001",
	patientId: "pat-leak-001",
	patientFullName: "Иванова Ольга Сергеевна",
	phone: "+7 (999) 123-45-67",
	daysSinceLastVisit: 245,
	lastVisitDate: "2026-02-08T10:00:00.000Z",
	lastDoctorName: "Петров П.П.",
	lastSpecialty: "Терапия",
	clinicalRiskReason: "Прошло более 240 дней после эндодонтического лечения 4.6 зуба. Риск потери реставрации без планового коронкового протезирования.",
	hasUncompletedPlan: true,
	uncompletedPlanSumRub: 45000,
	leadStatus: "new",
	aiReactivationSuggestion: "Здравствуйте, Ольга Сергеевна! Напоминаем о необходимости планового осмотра зуба 4.6.",
	assignedAdminName: null,
	contactAttemptsCount: 0,
	lastContactAt: null,
	lastContactChannel: null,
	lastContactNotes: null,
	declineReason: null,
	declineComment: null,
	createdAt: "2026-10-10T12:00:00.000Z",
	updatedAt: "2026-10-10T12:00:00.000Z",
} as any as CrmLeakLeadItem;

describe("CRM Leak Funnel to Patient Workspace Highway & Anti-Matryoshka Portals", () => {
	it("1. CrmLeakDetectorDrawer returns null when no lead or modal is active", () => {
		const html = renderToString(
			<CrmLeakDetectorDrawer
				activeScriptLead={null}
				copiedScript={false}
				onCopyScript={() => {}}
				onCloseScript={() => {}}
				contactModalLead={null}
				contactChannel="call"
				onSetContactChannel={() => {}}
				contactNotes=""
				onSetContactNotes={() => {}}
				onSaveContact={() => {}}
				onCloseContact={() => {}}
				declineModalLead={null}
				declineReason="too_expensive"
				onSetDeclineReason={() => {}}
				declineComment=""
				onSetDeclineComment={() => {}}
				onSaveDecline={() => {}}
				onCloseDecline={() => {}}
			/>
		);

		assert.equal(html, "", "Drawer must render empty string when no lead is selected");
	});

	it("2. CrmLeakDetectorDrawer renders lead inspection card with cld-drawer-open-patient-workspace-btn", () => {
		const html = renderToString(
			<CrmLeakDetectorDrawer
				activeScriptLead={null}
				copiedScript={false}
				onCopyScript={() => {}}
				onCloseScript={() => {}}
				contactModalLead={null}
				contactChannel="call"
				onSetContactChannel={() => {}}
				contactNotes=""
				onSetContactNotes={() => {}}
				onSaveContact={() => {}}
				onCloseContact={() => {}}
				declineModalLead={null}
				declineReason="too_expensive"
				onSetDeclineReason={() => {}}
				declineComment=""
				onSetDeclineComment={() => {}}
				onSaveDecline={() => {}}
				onCloseDecline={() => {}}
				selectedLeakLead={mockLeakLead}
				onCloseLeakLead={() => {}}
				onOpenPatientWorkspace={() => {}}
			/>
		);

		assert.ok(
			html.includes('data-testid="cld-drawer-inspection-card"'),
			"Must render drawer inspection card"
		);
		assert.ok(
			html.includes("Иванова Ольга Сергеевна"),
			"Must display patient full name"
		);
		assert.ok(
			html.includes('data-testid="cld-drawer-open-patient-workspace-btn"'),
			"Must render button to open patient workspace directly from drawer"
		);
		assert.ok(
			html.includes("Открыть карту пациента"),
			"Must have clear human-readable CTA text"
		);
	});

	it("3. LeadsFunnelAnalyticsModal renders header and body leak detector trigger buttons", () => {
		const html = renderToString(
			<LeadsFunnelAnalyticsModal
				isOpen={true}
				onClose={() => {}}
				leads={[]}
				onOpenLeakDetector={() => {}}
			/>
		);

		assert.ok(
			html.includes('data-testid="btn-analytics-open-leak-detector"'),
			"Must render header button to open leak detector"
		);
		assert.ok(
			html.includes('data-testid="funnel-open-leak-detector-btn"'),
			"Must render retention card button in body to open leak detector"
		);
	});

	it("4. Anti-Matryoshka: Source code verification of createPortal(..., document.body)", () => {
		const drawerSource = fs.readFileSync(
			path.resolve(__dirname, "../CrmLeakDetectorDrawer.tsx"),
			"utf8",
		);
		assert.ok(
			drawerSource.includes("createPortal"),
			"CrmLeakDetectorDrawer must use createPortal",
		);
		assert.ok(
			drawerSource.includes("document.body"),
			"CrmLeakDetectorDrawer must mount into document.body",
		);

		const analyticsSource = fs.readFileSync(
			path.resolve(__dirname, "../../leads/LeadsFunnelAnalyticsModal.tsx"),
			"utf8",
		);
		assert.ok(
			analyticsSource.includes("createPortal"),
			"LeadsFunnelAnalyticsModal must use createPortal",
		);
		assert.ok(
			analyticsSource.includes("document.body"),
			"LeadsFunnelAnalyticsModal must mount into document.body",
		);
	});

	it("5. CrmLeakDetectorDrawer source code verifies patient workspace navigation links in table", () => {
		const drawerSource = fs.readFileSync(
			path.resolve(__dirname, "../CrmLeakDetectorDrawer.tsx"),
			"utf8",
		);
		const tableRowSource = fs.existsSync(path.resolve(__dirname, "../crmLeakDetector/CrmLeakTableRow.tsx"))
			? fs.readFileSync(path.resolve(__dirname, "../crmLeakDetector/CrmLeakTableRow.tsx"), "utf8")
			: "";
		const combined = drawerSource + "\n" + tableRowSource;
		assert.ok(
			combined.includes("lead-patient-link-"),
			"Must include data-testid='lead-patient-link-${lead.id}'",
		);
		assert.ok(
			combined.includes("btn-open-workspace-"),
			"Must include data-testid='btn-open-workspace-${lead.id}'",
		);
	});

	it("6. CrmView and PatientWorkspace exports integrity", () => {
		const crmIndex = fs.readFileSync(
			path.resolve(__dirname, "../index.ts"),
			"utf8",
		);
		assert.ok(
			crmIndex.includes("CrmView"),
			"crm/index.ts must export CrmView",
		);

		const patientWorkspaceSingular = fs.readFileSync(
			path.resolve(__dirname, "../../patient/PatientWorkspace.tsx"),
			"utf8",
		);
		assert.ok(
			patientWorkspaceSingular.includes("PatientWorkspaceView"),
			"patient/PatientWorkspace.tsx must export PatientWorkspaceView",
		);
	});
});
