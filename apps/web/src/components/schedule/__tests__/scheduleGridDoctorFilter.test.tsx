/**
 * scheduleGridDoctorFilter.test.tsx
 *
 * DENTE Dental CRM — Schedule Grid Doctor Shifts, Chair Allocation & Viewport Resilience.
 *
 * Mandates Tested:
 * - Mandate 8b / 8zi: Sweet spot target (150–350 lines).
 * - Mandate 8d: Touch targets >= 44px, no text collision.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (clean 0-chair empty state vs solo practice).
 * - Mandate 8ze: 0px parasitic horizontal scroll, sticky time-column, responsive grid scaling.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import {
	ScheduleGrid,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
} from "./scheduleMockDomHarness";

const mockAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Schedule Grid Doctor Shifts, Chair Allocation & Responsive Layout (Mandates 8d, 8n, 8ze)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	// --- TEST 1: 2-Shift Chair Header Renders Morning & Evening Doctor Names, Shift Hours, and Active Shift Highlight ---
	it("1. 2-shift chair header renders morning & evening doctor names, shift hours, and active shift highlight", async () => {
		const chairAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-dual": {
				chairId: "chair-dual",
				doctorId: "doc-morn",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены: Утро + Вечер",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{
						doctorId: "doc-morn",
						doctorName: "Иванов Иван Иванович",
						doctorSpecialty: "Терапевт",
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: "doc-eve",
						doctorName: "Петров Петр Петрович",
						doctorSpecialty: "Хирург",
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				],
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ",
					timezone: "Europe/Moscow",
					mode: "clinic",
				},
				chairs: [{ id: "chair-dual", name: "Кабинет 1 (Терапия/Хирургия)", room: "1", active: true }],
				staff: [
					{ id: "doc-morn", fullName: "Иванов Иван Иванович", role: "doctor", active: true },
					{ id: "doc-eve", fullName: "Петров Петр Петрович", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: testDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: () => {},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: chairAssignments,
				}),
			);
		});

		// Multishift container must exist
		const multishiftEl = findNodeByTestId(container, "chair-doctor-multishift-chair-dual");
		assert.ok(multishiftEl, "Multishift container data-testid='chair-doctor-multishift-chair-dual' must exist");

		// Morning shift badge
		const mornEl = findNodeByTestId(container, "chair-shift-morning-chair-dual");
		assert.ok(mornEl, "Morning shift badge must exist");
		assert.ok(mornEl.textContent.includes("08:00–14:00"), "Must display morning hours (08:00–14:00)");
		assert.ok(mornEl.textContent.includes("Иванов И.И."), "Must display formatted morning doctor short name");

		// Evening shift badge
		const eveEl = findNodeByTestId(container, "chair-shift-evening-chair-dual");
		assert.ok(eveEl, "Evening shift badge must exist");
		assert.ok(eveEl.textContent.includes("14:00–20:00"), "Must display evening hours (14:00–20:00)");
		assert.ok(eveEl.textContent.includes("Петров П.П."), "Must display formatted evening doctor short name");
	});

	// --- TEST 2: Unassigned Chair Button Renders '+ Назначить врача' with Touch Target >= 44px ---
	it("2. Unassigned chair button renders '+ Назначить врача' with touch target >= 44px", async () => {
		const testDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ",
					timezone: "Europe/Moscow",
					mode: "clinic",
				},
				chairs: [{ id: "chair-unassigned", name: "Кабинет 3", room: "3", active: true }],
				staff: [
					{ id: "doc-1", fullName: "Смирнов Сергей", role: "doctor", active: true },
					{ id: "doc-2", fullName: "Ковалев Игорь", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: testDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: () => {},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: {},
				}),
			);
		});

		const assignBtn = findNodeByTestId(container, "btn-assign-doctor-chair-unassigned");
		assert.ok(assignBtn, "Button data-testid='btn-assign-doctor-chair-unassigned' must exist");
		assert.ok(assignBtn.textContent.includes("+ Назначить врача"), "Must contain '+ Назначить врача'");

		// Verify touch target >= 44px
		assert.ok(
			assignBtn.className?.includes("min-h-[44px]") || assignBtn.style?.minHeight === "44px",
			`Expected unassigned button to have min-h-[44px], got className: ${assignBtn.className}`,
		);
	});

	// --- TEST 3: 0 Chairs in Clinic Renders Empty State with '+ Создать первое кресло' ---
	it("3. 0 chairs in clinic renders data-testid='schedule-zero-chairs-empty-state' with '+ Создать первое кресло'", () => {
		const zeroChairsDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ (Новый филиал)",
					timezone: "Europe/Moscow",
					mode: "clinic", // Non-solo clinic mode
				},
				chairs: [], // Explicitly 0 chairs
				staff: [],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: zeroChairsDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "—",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		assert.match(html, /data-testid="schedule-zero-chairs-empty-state"/);
		assert.match(html, /В клинике пока нет настроенных кресел/);
		assert.match(html, /data-testid="btn-create-first-chair"/);
		assert.match(html, /\+ Создать первое кресло/);
		assert.match(html, /min-h-\[44px\]/);
	});

	// --- TEST 4: 10+ Chairs Renders with 'overflow-x-auto' and Time Column Has 'sticky left-0' ---
	it("4. 10+ chairs renders with overflow-x-auto and time column has sticky left-0", () => {
		const twelveChairs = Array.from({ length: 12 }, (_, i) => ({
			id: `chair-${i + 1}`,
			name: `Кресло ${i + 1}`,
			room: `${i + 1}`,
			active: true,
		}));

		const largeClinicDashboard = {
			clinicSettings: {
				profile: { clinicName: "Большой стоматологический центр", timezone: "Europe/Moscow", mode: "clinic" },
				chairs: twelveChairs,
				staff: [],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: largeClinicDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "—",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		assert.match(html, /overflow-x-auto/, "Must have horizontal scroll for 10+ chairs");
		assert.match(html, /repeat\(12, minmax\(180px, 1fr\)\)/, "Must render grid template columns for 12 chairs");
		assert.match(html, /sticky left-0/, "Time column must be pinned with sticky left-0 for horizontal scrolling");
	});
});
