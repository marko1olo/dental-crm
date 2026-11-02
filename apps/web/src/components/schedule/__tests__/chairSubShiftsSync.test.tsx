/**
 * chairSubShiftsSync.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 248 (Wave 59):
 * Chair SubShifts Two-Shift Binding (Morning + Evening) & Server Synchronization SSOT.
 *
 * Mandates Tested:
 * - Mandate 8b / 8zi: Sweet spot target (150–350 lines).
 * - Mandate 8e: Doctor & Staff Autonomy (frictionless shift changes, 0 disabled buttons).
 * - Mandate 8k: CRM != Reality Simulator (1-click morning/evening binding).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty with multi-chair scale resilience.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import {
	ChairScheduleView,
	syncShiftsWithServer,
	type SyncShiftPayload,
} from "../ChairScheduleView";
import {
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
} from "../ScheduleGrid";

import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	collectAllText,
	clickNode,
	createMockFn,
} from "./scheduleMockDomHarness";

const mockStaff = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		active: true,
		specialty: "Терапевт",
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		role: "doctor",
		active: true,
		specialty: "Хирург-имплантолог",
	},
	{
		id: "doc-3",
		fullName: "Сидорова Анна Сергеевна",
		role: "doctor",
		active: true,
		specialty: "Ортодонт",
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Установка 1 (Planmeca)",
		roomNumber: "101",
		room: "101",
		color: "#0d9488",
		specialization: "therapist",
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Установка 2 (Kavo)",
		roomNumber: "102",
		room: "102",
		color: "#3b82f6",
		specialization: "surgeon",
		isActive: true,
	},
];

const mockDashboard: Dashboard = {
	patients: [],
	appointments: [],
	inventory: [],
	operations: [],
	treatmentPlans: [],
	cashRegisters: [],
	clinicSettings: {
		chairs: mockChairs as any,
		staff: mockStaff as any,
		cabinets: [
			{ id: "cab-1", name: "Кабинет 101", chairIds: ["chair-1"] },
			{ id: "cab-2", name: "Кабинет 102", chairIds: ["chair-2"] },
		],
	} as any,
} as any;

describe("Chair SubShifts Two-Shift Binding & Server Synchronization (Wave 59 SSOT)", () => {
	let container: MockDomNode;
	let root: Root;
	let doc: any;

	beforeEach(() => {
		const env = setupMockDom();
		doc = env.doc;
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as any);
	});

	it("1. Two-shift binding: Morning + Evening merge into subShifts with shiftPreset 'two_shifts'", async () => {
		let assignedResult: ChairDoctorShiftAssignment | null = null;
		const onAssignChairDoctor = createMockFn((_chairId: string, assignment: ChairDoctorShiftAssignment | null) => {
			assignedResult = assignment;
		});

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// 1. Open shift popover for chair-1
		const assignBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
		assert.ok(assignBtn, "Assign doctor button must exist for chair-1");
		await clickNode(assignBtn);

		// 2. Select Doctor 1 (Иванов)
		const doc1Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-1");
		assert.ok(doc1Option, "Doctor 1 option must exist");
		await clickNode(doc1Option);

		// 3. Assign Morning shift
		const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
		assert.ok(morningBtn, "Morning shift button must exist");
		await clickNode(morningBtn);

		assert.ok(assignedResult, "First assignment should be recorded");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).shiftPreset, "morning");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).doctorId, "doc-1");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).startHour, 8);
		assert.equal((assignedResult as ChairDoctorShiftAssignment).endHour, 14);

		// Pass current assignments in props to simulate parent state update
		const currentAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": assignedResult,
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={currentAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// 4. Open popover again and assign Doctor 2 (Петров) to Evening shift on chair-1
		await clickNode(findNodeByTestId(container, "chair-view-assign-doctor-chair-1"));
		const doc2Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-2");
		assert.ok(doc2Option, "Doctor 2 option must exist");
		await clickNode(doc2Option);

		const eveningBtn = findNodeByTestId(container, "chair-view-shift-evening-chair-1");
		assert.ok(eveningBtn, "Evening shift button must exist");
		await clickNode(eveningBtn);

		// 5. Verify the assignment merged into two_shifts!
		assert.ok(assignedResult, "Merged assignment should exist");
		const merged = assignedResult as ChairDoctorShiftAssignment;
		assert.equal(merged.shiftPreset, "two_shifts", "Shift preset must be two_shifts");
		assert.equal(merged.shiftLabel, "2 смены (Утро + Вечер)");
		assert.equal(merged.shiftHours, "08:00–20:00");
		assert.equal(merged.startHour, 8);
		const subShiftsList = merged.subShifts ?? [];
		assert.equal(subShiftsList.length, 2, "Must contain exactly 2 subShifts");
		const sub0 = subShiftsList[0];
		const sub1 = subShiftsList[1];
		assert.ok(sub0 && sub1, "Both subShifts must exist");
		assert.equal(sub0.doctorId, "doc-1", "Morning subShift must be Doctor 1");
		assert.equal(sub0.startHour, 8);
		assert.equal(sub0.endHour, 14);
		assert.equal(sub1.doctorId, "doc-2", "Evening subShift must be Doctor 2");
		assert.equal(sub1.startHour, 14);
		assert.equal(sub1.endHour, 20);

		// 6. Assign Full Day ("full") on the merged chair -> resets to single doctor full day
		currentAssignments["chair-1"] = merged;
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={currentAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		await clickNode(findNodeByTestId(container, "chair-view-assign-doctor-chair-1"));
		const fullBtn = findNodeByTestId(container, "chair-view-shift-full-chair-1");
		assert.ok(fullBtn, "Full day button must exist");
		await clickNode(fullBtn);

		const fullAssignment = assignedResult as ChairDoctorShiftAssignment;
		assert.equal(fullAssignment.shiftPreset, "full", "Full day resets two_shifts to single full shift");
		assert.equal(fullAssignment.shiftLabel, "Весь день");
		assert.equal(fullAssignment.subShifts, undefined, "subShifts must be cleared for full day");
	});

	it("2. Chair toolbar badge displays dual-doctor '(У: Иванов И.И. / В: Петров П.П.)' format", async () => {
		const morningSub: ChairDoctorSubShift = {
			doctorId: "doc-1",
			doctorName: "Иванов Иван Иванович",
			startHour: 8,
			endHour: 14,
			shiftHours: "08:00–14:00",
		};
		const eveningSub: ChairDoctorSubShift = {
			doctorId: "doc-2",
			doctorName: "Петров Петр Петрович",
			startHour: 14,
			endHour: 20,
			shiftHours: "14:00–20:00",
		};

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Установка 1 (Planmeca)",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович / Петров Петр Петрович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены (Утро + Вечер)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [morningSub, eveningSub],
			},
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={assignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const docBadge = findNodeByTestId(container, "chair-view-doc-chair-1");
		assert.ok(docBadge, "Chair doctor badge must exist for chair-1");
		const badgeText = collectAllText(docBadge);
		assert.ok(
			badgeText.includes("У: Иванов И.И.") && badgeText.includes("В: Петров П.П."),
			`Badge text must contain formatted morning and evening doctors: "${badgeText}"`,
		);
	});

	it("3. syncShiftsWithServer formats subShifts properly and invokes POST /api/schedule/shifts with SyncShiftPayload", async () => {
		const morningSub: ChairDoctorSubShift = {
			doctorId: "doc-1",
			doctorName: "Иванов Иван Иванович",
			doctorSpecialty: "Терапевт",
			startHour: 8,
			endHour: 14,
			shiftHours: "08:00–14:00",
		};
		const eveningSub: ChairDoctorSubShift = {
			doctorId: "doc-2",
			doctorName: "Петров Петр Петрович",
			doctorSpecialty: "Хирург",
			startHour: 14,
			endHour: 20,
			shiftHours: "14:00–20:00",
		};

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Установка 1 (Planmeca)",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович / Петров Петр Петрович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены (Утро + Вечер)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [morningSub, eveningSub],
			},
		};

		let capturedUrl = "";
		let capturedOptions: any = null;
		(globalThis as any).fetch = createMockFn((url: string, opts: any) => {
			capturedUrl = url;
			capturedOptions = opts;
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ok: true }),
			});
		});

		const syncSuccess = await syncShiftsWithServer("2026-09-09", assignments, mockChairs as any);
		assert.equal(syncSuccess, true, "syncShiftsWithServer should return true on success");
		assert.equal(capturedUrl, "/api/schedule/shifts", "Must POST to /api/schedule/shifts");
		assert.equal(capturedOptions.method, "POST");

		const payload: { shifts: SyncShiftPayload[] } = JSON.parse(capturedOptions.body);
		assert.ok(Array.isArray(payload.shifts), "Payload must contain shifts array");
		assert.equal(payload.shifts.length, 2, "Two-shift assignment must generate exactly 2 distinct shift records");

		const morn = payload.shifts.find((s) => s.doctorId === "doc-1");
		assert.ok(morn, "Morning shift record must exist");
		assert.equal(morn.startTime, "08:00");
		assert.equal(morn.endTime, "14:00");
		assert.equal(morn.durationHours, 6);
		assert.equal(morn.chairId, "chair-1");

		const eve = payload.shifts.find((s) => s.doctorId === "doc-2");
		assert.ok(eve, "Evening shift record must exist");
		assert.equal(eve.startTime, "14:00");
		assert.equal(eve.endTime, "20:00");
		assert.equal(eve.durationHours, 6);
		assert.equal(eve.chairId, "chair-1");
	});
});
