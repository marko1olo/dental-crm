/**
 * stomxCashOutAndTaskCallsAutonomyWave113.test.tsx
 *
 * DENTE Dental CRM — Wave 113 Test Suite
 * StomX Cash Drawer Outflow / Payouts (РКО КО-2) & 7 Patient Care Task Call Categories
 *
 * Governed by:
 * - Supreme Law: THE HAMMER (THE_HAMMER_MASTER_PROMPT.md)
 * - Mandate 8b: Exact kopecks math & legal accuracy (КО-2 расходный кассовый ордер)
 * - Mandate 8e: Doctor & Receptionist Autonomy (1-click presets, 0-friction)
 * - Mandate 8d: 7 Deadly Sins Checklist (No mocks, no clipping)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	STOMX_TASK_CALLS_CATALOG,
	STOMX_TASK_CALL_BY_TYPE,
	STOMX_CASH_EXPENSE_CATALOG,
	getTaskCallMeta,
	type StomxTaskCallType,
} from "@dental/shared";
import { CashShiftWidget } from "../../finance/CashShiftWidget";
import { PatientRecallsHubModal } from "../../recalls/PatientRecallsHubModal";
import {
	determineTaskCallTypeForCandidate,
	type PatientRecallRecord,
} from "../../recalls/patientRecallEngine";

describe("Wave 113 — StomX Cash Out (РКО КО-2) & Task Calls Workflow", () => {
	describe("1. Shared Catalogs & Metadata Integrity", () => {
		it("STOMX_TASK_CALLS_CATALOG contains exactly 7 canonical StomX task call types", () => {
			assert.equal(STOMX_TASK_CALLS_CATALOG.length, 7);

			const expectedTypes: StomxTaskCallType[] = [
				"learn_health",
				"preventive_inspection",
				"medplan_not_started",
				"medplan_not_finished",
				"appointment_confirmation",
				"appointment_refuse",
				"birthday",
			];

			for (const t of expectedTypes) {
				assert.ok(STOMX_TASK_CALL_BY_TYPE[t], `Missing catalog item for ${t}`);
				const meta = getTaskCallMeta(t);
				assert.ok(meta, `Meta should exist for ${t}`);
				assert.equal(meta.type, t);
				assert.ok(meta.titleRu.length > 0);
				assert.ok(meta.shortLabelRu.length > 0);
				assert.ok(meta.defaultScriptRu.length > 0);
			}
		});

		it("STOMX_CASH_EXPENSE_CATALOG contains 14 presets with valid alias, name, and descriptions", () => {
			assert.equal(STOMX_CASH_EXPENSE_CATALOG.length, 14);
			for (const item of STOMX_CASH_EXPENSE_CATALOG) {
				assert.ok(item.alias.length > 0);
				assert.ok(item.name.length > 0);
				assert.ok(item.descriptionRu && item.descriptionRu.length > 0);
			}
		});

		it("determineTaskCallTypeForCandidate accurately maps recall candidates to task call types", () => {
			const candidate1: PatientRecallRecord = {
				id: "rec-1",
				patientId: "p1",
				fullName: "Алексеев А.А.",
				phone: "+7 900 123-45-67",
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-09-10",
				dueDate: "2026-09-11",
				daysOverdue: 0,
				urgencyStatus: "due_now",
				status: "pending",
				clinicalNotes: "После удаления зуба 36: контроль самочувствия через 24 часа",
			};
			assert.equal(determineTaskCallTypeForCandidate(candidate1), "learn_health");

			const candidate2: PatientRecallRecord = {
				id: "rec-2",
				patientId: "p2",
				fullName: "Борисов Б.Б.",
				phone: "+7 900 234-56-78",
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-03-15",
				dueDate: "2026-09-15",
				daysOverdue: -4,
				urgencyStatus: "upcoming",
				status: "pending",
				clinicalNotes: "план лечения не начат, связаться с куратором",
			};
			assert.equal(determineTaskCallTypeForCandidate(candidate2), "medplan_not_started");

			const candidate3: PatientRecallRecord = {
				id: "rec-3",
				patientId: "p3",
				fullName: "Васильев В.В.",
				phone: "+7 900 345-67-89",
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-03-10",
				dueDate: "2026-09-10",
				daysOverdue: 1,
				urgencyStatus: "due_now",
				status: "scheduled",
			};
			assert.equal(determineTaskCallTypeForCandidate(candidate3), "appointment_confirmation");

			const candidate4: PatientRecallRecord = {
				id: "rec-4",
				patientId: "p4",
				fullName: "Григорьев Г.Г.",
				phone: "+7 900 456-78-90",
				cycleType: "standard_prophylaxis",
				lastVisitDate: "2026-03-01",
				dueDate: "2026-09-01",
				daysOverdue: 10,
				urgencyStatus: "overdue_30",
				status: "pending",
			};
			assert.equal(determineTaskCallTypeForCandidate(candidate4), "preventive_inspection");
		});
	});

	describe("2. CashShiftWidget — Cash Out (Выемка / РКО КО-2)", () => {
		it("renders cash out navigation tab button (tab-cash-out-mode)", () => {
			const html = renderToString(
				React.createElement(CashShiftWidget, {
					initialIsOpen: true,
					initialCashFlowModalOpen: true,
					initialCashFlowMode: "cash_out",
					shiftNumber: 42,
					cashierName: "Кассир К.",
				})
			);

			assert.ok(html.includes('data-testid="tab-cash-out-mode"'), "Missing cash-out nav tab button");
			assert.ok(html.includes("Расход"), "Missing cash-out tab label");
			assert.ok(html.includes('data-testid="tab-cash-in-mode"'), "Missing cash-in nav tab button");
			assert.ok(html.includes("Внесение"), "Missing cash-in tab label");
		});

		it("contains no synthetic test characters (Барабаш, Волкова, Сидорова) in initial state", () => {
			const html = renderToString(
				React.createElement(CashShiftWidget, {
					initialIsOpen: true,
					shiftNumber: 1,
				})
			);

			assert.equal(html.includes("Барабаш"), false, "Found synthetic Барабаш in cash shift widget");
			assert.equal(html.includes("Волкова"), false, "Found synthetic Волкова in cash shift widget");
			assert.equal(html.includes("Сидорова"), false, "Found synthetic Сидорова in cash shift widget");
		});
	});

	describe("3. PatientRecallsHubModal — StomX Task Calls Tab", () => {
		it("renders task calls tab button (tab-task-calls)", () => {
			const html = renderToString(
				React.createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
				})
			);

			assert.ok(html.includes('data-testid="tab-task-calls"'), "Missing tab-task-calls button");
			assert.ok(html.includes("Задачи сервисных звонков (StomX)"), "Missing tab label");
			assert.ok(html.includes("Реестр пациентов"), "Missing registry tab");
			assert.ok(html.includes("Когорты Retention"), "Missing cohorts tab");
		});

		it("contains zero synthetic mocks in recalls hub modal", () => {
			const html = renderToString(
				React.createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
				})
			);

			assert.equal(html.includes("Барабаш"), false, "Found synthetic Барабаш in recalls hub modal");
			assert.equal(html.includes("Волкова"), false, "Found synthetic Волкова in recalls hub modal");
			assert.equal(html.includes("Сидорова"), false, "Found synthetic Сидорова in recalls hub modal");
		});
	});
});
