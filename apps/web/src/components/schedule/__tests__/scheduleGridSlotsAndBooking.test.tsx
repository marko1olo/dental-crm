/**
 * scheduleGridSlotsAndBooking.test.tsx
 *
 * DENTE Dental CRM — Schedule Grid Slots & Quick Booking Drawer Red-Team Test Suite.
 *
 * Mandates Tested:
 * - Mandate 8b / 8zi: Sweet spot target (150–350 lines).
 * - Mandate 8d: Touch targets >= 44px, no text collision, dark mode CSS theme hygiene.
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking doctor override).
 * - Mandate 8k: CRM != Reality Simulator (1-click slot booking, zero friction).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import {
	ScheduleGrid,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import { QuickBookingDrawer, resolveChairDutyDoctor } from "../QuickBookingDrawer";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	clickNode,
	changeNode,
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

describe("Schedule Grid Slots & Quick Booking Drawer Suite (Mandates 8d, 8e, 8k)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	// --- TEST 1: Slot Click Before 14:00 Passes Morning Doctor ID; At/After 14:00 Passes Evening Doctor ID ---
	it("1. Slot click before 14:00 passes morning doctor ID; at/after 14:00 passes evening doctor ID to onSlotClick", async () => {
		const slotCalls: any[] = [];
		const chairAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-dual": {
				chairId: "chair-dual",
				doctorId: "doc-morn",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{ doctorId: "doc-morn", doctorName: "Иванов И.И.", startHour: 8, endHour: 14, shiftHours: "08:00–14:00" },
					{ doctorId: "doc-eve", doctorName: "Петров П.П.", startHour: 14, endHour: 20, shiftHours: "14:00–20:00" },
				],
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow", mode: "clinic" },
				chairs: [{ id: "chair-dual", name: "Кабинет 1", room: "1", active: true }],
				staff: [
					{ id: "doc-morn", fullName: "Иванов И.И.", role: "doctor", active: true },
					{ id: "doc-eve", fullName: "Петров П.П.", role: "doctor", active: true },
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
					onSlotClick: (slot: any) => {
						slotCalls.push(slot);
					},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: chairAssignments,
				}),
			);
		});

		// Click 10:00 slot (morning shift)
		const slot10 = findNodeByTestId(container, "btn-slot-chair-dual-1000");
		assert.ok(slot10, "Slot 10:00 button must exist");
		await clickNode(slot10);
		assert.equal(slotCalls.length, 1);
		assert.equal(slotCalls[0].doctorUserId, "doc-morn", "Slot 10:00 must bind morning doctor");

		// Click 15:00 slot (evening shift)
		const slot15 = findNodeByTestId(container, "btn-slot-chair-dual-1500");
		assert.ok(slot15, "Slot 15:00 button must exist");
		await clickNode(slot15);
		assert.equal(slotCalls.length, 2);
		assert.equal(slotCalls[1].doctorUserId, "doc-eve", "Slot 15:00 must bind evening doctor");

		// Click 20:00 slot (evening shift boundary)
		const slot20 = findNodeByTestId(container, "btn-slot-chair-dual-2000");
		assert.ok(slot20, "Slot 20:00 button must exist");
		await clickNode(slot20);
		assert.equal(slotCalls.length, 3);
		assert.equal(slotCalls[2].doctorUserId, "doc-eve", "Slot 20:00 must bind evening doctor");
	});

	// --- TEST 2: QuickBookingDrawer: resolveChairDutyDoctor Accurately Identifies Morning vs Evening vs Null ---
	it("2. QuickBookingDrawer: resolveChairDutyDoctor accurately identifies morning vs evening vs out-of-shift doctor", () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{ doctorId: "doc-1", doctorName: "Д-р Иванов", startHour: 8, endHour: 14, shiftHours: "08:00–14:00" },
					{ doctorId: "doc-2", doctorName: "Д-р Петров", startHour: 14, endHour: 20, shiftHours: "14:00–20:00" },
				],
			},
		};

		// 10:00 -> morning doctor
		const mornDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T10:00", assignments);
		assert.equal(mornDuty.doctorId, "doc-1");
		assert.equal(mornDuty.shiftHours, "08:00–14:00");

		// 16:30 -> evening doctor
		const eveDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T16:30", assignments);
		assert.equal(eveDuty.doctorId, "doc-2");
		assert.equal(eveDuty.shiftHours, "14:00–20:00");

		// 20:00 -> evening doctor boundary
		const boundaryDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T20:00", assignments);
		assert.equal(boundaryDuty.doctorId, "doc-2");

		// 22:00 -> out of shift
		const nightDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T22:00", assignments);
		assert.equal(nightDuty.doctorId, null, "22:00 must return null doctorId");

		// 06:00 -> out of shift
		const earlyDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T06:00", assignments);
		assert.equal(earlyDuty.doctorId, null, "06:00 must return null doctorId");
	});

	// --- TEST 3: QuickBookingDrawer Displays Soft Override Note, Submit Remains Enabled (Mandate 8e) ---
	it("3. QuickBookingDrawer displays soft override note when registrar selects another doctor, submit button remains enabled (Mandate 8e)", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-duty",
				doctorName: "Д-р Дежурный А.А.",
				shiftPreset: "full",
				shiftLabel: "Полный день",
				shiftHours: "08:00–20:00",
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow" },
				chairs: [{ id: "chair-1", name: "Кабинет 1", room: "1", active: true }],
				staff: [
					{ id: "doc-duty", fullName: "Д-р Дежурный А.А.", role: "doctor", active: true },
					{ id: "doc-other", fullName: "Д-р Другой Б.Б.", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [{ id: "pat-1", fullName: "Сидоров Сидор", phone: "+7 999 111-22-33" }],
		} as unknown as Dashboard;

		// Initial slot booked with duty doctor
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-07",
						startTime: "10:00",
						doctorUserId: "doc-duty",
					},
					dashboard: testDashboard,
					chairDoctorAssignments: assignments,
				}),
			);
		});

		// Duty doctor badge is displayed in document.body (portal target)
		const bodyNode = (document.body as unknown) as MockDomNode;
		const dutyBadge = findNodeByTestId(bodyNode, "duty-doctor-badge");
		assert.ok(dutyBadge, "Duty doctor badge must be displayed");
		assert.ok(dutyBadge.textContent.includes("Дежурный врач"));

		// Simulate selecting another doctor via the doctor select input
		const doctorSelect = findNodeByTestId(bodyNode, "select-booking-doctor");
		assert.ok(doctorSelect, "Doctor select dropdown must exist");

		// Change doctor to 'doc-other'
		await changeNode(doctorSelect, "doc-other");

		// Check for soft override notice
		const overrideNote = findNodeByTestId(bodyNode, "duty-doctor-override-note");
		assert.ok(overrideNote, "Non-blocking override notice must appear when selecting different doctor");
		assert.ok(
			overrideNote.textContent.includes("Мандат 8e") || overrideNote.textContent.includes("не блокируется"),
			"Override note must emphasize non-blocking doctor autonomy",
		);

		// MANDATE 8e AUDIT: Verify submit button is NOT disabled
		const submitButtons = bodyNode.children.flatMap(function getAll(n): MockDomNode[] {
			return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
		}).filter((n) => n.tagName === "BUTTON" && (n.textContent?.includes("Создать запись") || n.textContent?.includes("Ctrl+Enter")));

		assert.ok(submitButtons.length > 0, "Submit booking button must exist");
		const submitBtn = submitButtons[0]!;
		assert.equal(submitBtn.disabled, false, "Mandate 8e: submit button must NOT be disabled when doctor is overridden!");
	});

	// --- TEST 4: QuickBookingDrawer Button Touch Targets >= 44px and Dark Mode Theme Variable Hygiene ---
	it("4. QuickBookingDrawer button touch targets >= 44px and dark mode theme variable hygiene", async () => {
		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow" },
				chairs: [{ id: "chair-1", name: "Кабинет 1", room: "1", active: true }],
				staff: [{ id: "doc-1", fullName: "Д-р Иванов", role: "doctor", active: true }],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: testDashboard,
				}),
			);
		});

		const bodyNode = (document.body as unknown) as MockDomNode;

		// 1. CITO express patient button: min-h-[44px]
		const citoBtn = findNodeByTestId(bodyNode, "quick-booking-cito-express-btn");
		assert.ok(citoBtn, "CITO button must exist");
		assert.ok(citoBtn.className?.includes("min-h-[44px]"), "CITO express button must have touch target min-h-[44px]");

		// 2. Blank contract print button: min-h-[44px]
		const contractBtn = findNodeByTestId(bodyNode, "quick-booking-print-blank-contract-btn");
		assert.ok(contractBtn, "Print blank contract button must exist");
		assert.ok(contractBtn.className?.includes("min-h-[44px]"), "Print blank contract button must have touch target min-h-[44px]");

		// 3. Main footer buttons: min-h-[44px]
		const buttons = bodyNode.children.flatMap(function getAll(n): MockDomNode[] {
			return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
		}).filter((n) => n.tagName === "BUTTON");

		const cancelBtn = buttons.find((b) => b.textContent?.includes("Отмена (Esc)"));
		assert.ok(cancelBtn, "Cancel button must exist");
		assert.ok(cancelBtn.className?.includes("min-h-[44px]"), "Cancel button must have min-h-[44px]");

		const submitBtn = buttons.find((b) => b.attributes?.["data-testid"] === "quick-drawer-save-btn" || b.textContent?.includes("Создать запись") || b.textContent?.includes("Записать на приём"));
		assert.ok(submitBtn, "Submit button must exist");
		assert.ok(submitBtn.className?.includes("min-h-[44px]"), "Submit button must have min-h-[44px]");

		// 4. Dark mode theme hygiene: check semantic CSS tokens
		assert.ok(submitBtn.className?.includes("var(--teal-dark)"), "Must use var(--teal-dark) for primary action contrast");
		assert.ok(cancelBtn.className?.includes("var(--paper)"), "Must use var(--paper) for cancel button");
	});
});
