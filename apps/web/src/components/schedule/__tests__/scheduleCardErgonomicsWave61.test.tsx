import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";
import { GridAppointmentCard } from "../GridAppointmentCard";
import { getNormalizedAppointmentStatusLabel } from "../appointmentCardHelpers";
import { appointmentLabels } from "../../../workspaceUiLabels";

const mockDashboard: Dashboard = {
	clinicSettings: {
		staff: [
			{
				id: "doc-1",
				fullName: "Петров Сергей Михайлович",
				role: "doctor",
				specialty: "Хирургия",
				active: true,
			},
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет 1" },
			{ id: "chair-2", name: "Кабинет 2" },
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Петров Сергей Николаевич",
			phone: "+7 (903) 777-11-22",
			birthDate: "1980-05-15",
			balanceRub: 0,
		},
		{
			id: "pat-2",
			fullName: "Иванов Алексей Сергеевич",
			phone: "+7 (916) 123-45-67",
			birthDate: "1992-03-20",
			balanceRub: 0,
		},
	],
} as any;

const plannedAppt: Appointment = {
	id: "a1000000-0000-0000-0000-000000000001",
	organizationId: "org-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	chairId: "chair-2",
	status: "planned",
	startsAt: "2026-09-27T10:00:00.000Z",
	endsAt: "2026-09-27T11:30:00.000Z",
	reason: "Атипичное удаление 38 зуба",
	comment: "Пациент предупрежден о длительности процедуры",
};

const completedAppt: Appointment = {
	id: "a1000000-0000-0000-0000-000000000002",
	organizationId: "org-1",
	patientId: "pat-2",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	status: "completed",
	startsAt: "2026-09-27T09:00:00.000Z",
	endsAt: "2026-09-27T10:00:00.000Z",
	reason: "Терапия: Лечение кариеса",
	comment: null,
};

test("Wave 61: Schedule Card Ergonomics — Vertical distribution and badge unification", async (t) => {
	await t.test("1. Normalization of planned status produces Запланирован across SSOT", () => {
		assert.equal(
			getNormalizedAppointmentStatusLabel("planned", appointmentLabels),
			"Запланирован",
			"planned status must normalize to Запланирован to prevent confusion with treatment plans",
		);
		assert.equal(
			appointmentLabels.planned,
			"Запланирован",
			"SSOT appointmentLabels.planned must be Запланирован",
		);
		assert.equal(
			getNormalizedAppointmentStatusLabel("completed", appointmentLabels),
			"Ожидает оплаты",
		);
	});

	await t.test("2. Planned appointment renders distinct Запланирован status badge on card face", () => {
		const html = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: plannedAppt,
				chair: { id: "chair-2", name: "Кабинет 2" },
				effectiveChairs: [{ id: "chair-2", name: "Кабинет 2" }],
				doctors: [{ id: "doc-1", fullName: "Петров Сергей Михайлович" }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Петров Сергей Н.",
				dashboard: mockDashboard,
				timezone: "UTC",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels,
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		// Status badge renders Запланирован
		assert.ok(html.includes("Запланирован"), "Status badge must display Запланирован");
		assert.ok(!html.includes(">План<"), "Status badge must not be abbreviated as bare План");
		assert.ok(html.includes("data-testid=\"appointment-card-status-badge-a1000000-0000-0000-0000-000000000001\""));

		// Vertical distribution classes: unified progressive-height layout on container hierarchy
		assert.ok(html.includes("appointment-card-grid-unified w-full h-full min-w-0 flex-1"), "Grid must stretch to h-full flex-1");
		assert.ok(html.includes("appointment-card-row-header flex items-center justify-between gap-1.5 w-full min-w-0"), "Header row must stretch to full width");
		assert.ok(html.includes("appointment-card-row-procedure flex items-center gap-1.5"), "Procedure row must span full width");
		assert.ok(html.includes("appointment-card-row-footer flex items-center justify-between gap-1.5 w-full min-w-0 pt-1 border-t border-[var(--line)]/50 mt-auto"), "Footer cluster must anchor to bottom with mt-auto");

		// Comments rendered
		assert.ok(html.includes("Пациент предупрежден о длительности процедуры"), "Clinical comment must be displayed in card");

		// Time string
		assert.ok(
			html.includes("10:00"),
			"Start time must be rendered in header",
		);
	});

	await t.test("3. Quick status picker popover includes Запланирован action button", () => {
		const html = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: plannedAppt,
				chair: { id: "chair-2", name: "Кабинет 2" },
				effectiveChairs: [{ id: "chair-2", name: "Кабинет 2" }],
				doctors: [{ id: "doc-1", fullName: "Петров Сергей Михайлович" }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Петров Сергей Н.",
				dashboard: mockDashboard,
				timezone: "UTC",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels,
				isHovered: false,
				isStatusPickerOpen: true,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"quick-status-picker-planned-a1000000-0000-0000-0000-000000000001\""));
	});

	await t.test("4. Treatment plan badge is distinct from visit status", () => {
		const apptWithPlan = {
			...plannedAppt,
			id: "a1000000-0000-0000-0000-000000000003",
			treatmentPlanId: "PLAN-777",
		};

		const html = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: apptWithPlan as any,
				chair: { id: "chair-2", name: "Кабинет 2" },
				effectiveChairs: [{ id: "chair-2", name: "Кабинет 2" }],
				doctors: [{ id: "doc-1", fullName: "Петров Сергей Михайлович" }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Петров Сергей Н.",
				dashboard: mockDashboard,
				timezone: "UTC",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels,
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		// Contains separate treatment plan badge
		assert.ok(html.includes("data-testid=\"appointment-treatment-plan-badge-a1000000-0000-0000-0000-000000000003\""));
		// Contains separate status badge
		assert.ok(html.includes("data-testid=\"appointment-card-status-badge-a1000000-0000-0000-0000-000000000003\""));
		assert.ok(html.includes("Запланирован"));
	});

	await t.test("5. Mandate 8d: 0 cartoon emojis in card output", () => {
		const html = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: completedAppt,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-1", fullName: "Петров Сергей Михайлович" }],
				patientLookupMap: new Map([["pat-2", mockDashboard.patients[1]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Иванов Алексей С.",
				dashboard: mockDashboard,
				timezone: "UTC",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels,
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Card must not contain cartoon emojis");
	});
});
