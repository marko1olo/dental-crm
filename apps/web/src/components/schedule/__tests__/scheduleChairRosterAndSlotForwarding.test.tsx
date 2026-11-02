/**
 * scheduleChairRosterAndSlotForwarding.test.tsx
 *
 * DENTE Dental CRM — Wave 43 StomX & IDENT Parity: Chair Roster & Slot Click Forwarding
 * SSOT for Mandates 8b, 8zi, 8d (Doctor Shifts & Forwarding Autonomy).
 *
 * Scope:
 * 1. ChairScheduleView: 1-Click Doctor and Shift Assignment (Morning, Evening, Full Day, + Врач).
 * 2. ChairScheduleView: Slot Click Forwarding with resolveChairDutyDoctor.
 * 3. Compact 1-row toolbar (32-36px) without label truncation.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import { ChairScheduleView } from "../ChairScheduleView";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	clickNode,
} from "./scheduleMockDomHarness";

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Константинопольский Александр Владимирович",
		role: "doctor",
		specialty: "Стоматолог-терапевт",
		active: true,
	},
	{
		id: "doc-2",
		fullName: "Соколова Елена Дмитриевна",
		role: "doctor",
		specialty: "Стоматолог-хирург",
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		roomNumber: "1",
		room: "1",
		color: "#0d9488",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		roomNumber: "2",
		room: "2",
		color: "#0284c7",
		defaultDoctorId: "doc-2",
		active: true,
	},
];

const mockPatients = [
	{
		id: "pat-1",
		fullName: "Смирнов Алексей Владимирович",
		phone: "+7 999 111-22-33",
		status: "active",
		balance: 0,
		totalSpent: 12000,
		gender: "male",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
	{
		id: "pat-2",
		fullName: "Кузнецова Мария Ивановна",
		phone: "+7 999 444-55-66",
		status: "active",
		balance: 5000,
		totalSpent: 45000,
		gender: "female",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
];

const mockDashboard = {
	stats: {
		totalPatients: 2,
		activeTreatmentPlans: 1,
		todayAppointmentsCount: 1,
		monthRevenue: 100000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			timezone: "Europe/Moscow",
		},
		staff: mockDoctors,
		chairs: mockChairs,
	},
	patients: mockPatients,
	appointments: [],
	activeVisit: null,
} as unknown as Dashboard;

describe("Wave 43: Chair Roster & Slot Click Forwarding", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("1. ChairScheduleView: 1-Click Doctor and Shift Assignment", () => {
		it("opens shift popover and assigns morning shift (08:00–14:00)", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedChairId: string | null = null;
			let assignedShift: any = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(chairId, assignment) => {
							assignedChairId = chairId;
							assignedShift = assignment;
						}}
					/>,
				);
			});

			// Open popover for Chair 1
			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(triggerBtn, "Assign doctor button must exist for chair 1");
			await clickNode(triggerBtn);

			// Popover must be rendered
			const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
			assert.ok(popover, "Shift popover must be opened");

			// Click Morning preset
			const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
			assert.ok(morningBtn, "Morning preset button must exist");
			await clickNode(morningBtn);

			assert.equal(assignedChairId, "chair-1");
			assert.ok(assignedShift);
			assert.equal(assignedShift.doctorId, "doc-1");
			assert.equal(assignedShift.shiftPreset, "morning");
			assert.equal(assignedShift.shiftLabel, "Утро 08-14");
			assert.equal(assignedShift.shiftHours, "08:00–14:00");
			assert.equal(assignedShift.startHour, 8);
			assert.equal(assignedShift.endHour, 14);
		});

		it("allows selecting a different doctor and assigning evening shift (14:00–20:00)", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: any = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_chairId, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			// Select doctor 2 in the popover list
			const doc2Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-2");
			assert.ok(doc2Option, "Doc 2 option must be in popover");
			await clickNode(doc2Option);

			// Click Evening preset
			const eveningBtn = findNodeByTestId(container, "chair-view-shift-evening-chair-1");
			assert.ok(eveningBtn, "Evening preset button must exist");
			await clickNode(eveningBtn);

			assert.ok(assignedShift);
			assert.equal(assignedShift.doctorId, "doc-2");
			assert.equal(assignedShift.shiftPreset, "evening");
			assert.equal(assignedShift.shiftLabel, "Вечер 14-20");
			assert.equal(assignedShift.shiftHours, "14:00–20:00");
			assert.equal(assignedShift.startHour, 14);
			assert.equal(assignedShift.endHour, 20);
		});

		it("assigns full day (08:00–20:00) and unassigns doctor correctly", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: any = null;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский А.В.",
					shiftPreset: "full",
					shiftLabel: "Весь день",
					shiftHours: "08:00–20:00",
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_chairId, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			const unassignBtn = findNodeByTestId(container, "chair-view-unassign-chair-1");
			assert.ok(unassignBtn, "Unassign button must exist when assignment is active");
			await clickNode(unassignBtn);

			assert.equal(assignedShift, null, "Unassigning doctor must pass null to onAssignChairDoctor");
		});

		it("displays + Врач badge on unstaffed chair and opens shift popover in 1 click", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const dashboardWithUnstaffedChair = {
				...mockDashboard,
				clinicSettings: {
					...mockDashboard.clinicSettings,
					chairs: [
						{
							id: "chair-unstaffed",
							name: "Кресло 3 (Без врача)",
							roomNumber: "3",
							active: true,
						},
					],
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={dashboardWithUnstaffedChair as any}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={{}}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const unstaffedBadge = findNodeByTestId(container, "chair-view-unstaffed-badge-chair-unstaffed");
			assert.ok(unstaffedBadge, "+ Врач badge must be displayed on unstaffed active chair");
			assert.ok(unstaffedBadge.textContent.includes("+ Врач"));

			await clickNode(unstaffedBadge);

			const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-unstaffed");
			assert.ok(popover, "Clicking + Врач badge must open the shift popover immediately");
		});

		it("assigns doctor full-day in 1 click when selecting doctor on unassigned chair", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: any = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={{}}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_chairId, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			const doc2Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-2");
			assert.ok(doc2Option, "Doc 2 option must exist in popover");
			await clickNode(doc2Option);

			assert.ok(assignedShift, "Clicking doctor on unassigned chair must immediately assign doctor");
			assert.equal(assignedShift.doctorId, "doc-2");
			assert.equal(assignedShift.shiftPreset, "full");
			assert.equal(assignedShift.shiftHours, "08:00–20:00");
			assert.equal(assignedShift.startHour, 8);
			assert.equal(assignedShift.endHour, 20);
		});
	});

	describe("2. ChairScheduleView: Slot Click Forwarding with resolveChairDutyDoctor", () => {
		it("forwards chairId, dateKey, startTime, startsAt and duty doctor into onSlotClick", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let capturedSlot: any = null;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "morning",
					shiftLabel: "Утро 08-14",
					shiftHours: "08:00–14:00",
					startHour: 8,
					endHour: 14,
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={(slot) => {
							capturedSlot = slot;
						}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const slot1000 = findNodeByTestId(container, "btn-slot-chair-1-1000");
			assert.ok(slot1000, "Slot button 10:00 on chair-1 must exist");

			await clickNode(slot1000);

			assert.ok(capturedSlot, "onSlotClick must have been called");
			assert.equal(capturedSlot.chairId, "chair-1");
			assert.equal(capturedSlot.dateKey, "2026-09-08");
			assert.equal(capturedSlot.startTime, "10:00");
			assert.equal(capturedSlot.startsAt, "2026-09-08T10:00:00");
			assert.equal(capturedSlot.doctorUserId, "doc-1");
			assert.equal(capturedSlot.doctorName, "Константинопольский Александр Владимирович");
		});

		it("renders unified 1-row toolbar (32-36px) with room and doctor labels without truncation", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "morning",
					shiftLabel: "Утро 08-14",
					shiftHours: "08:00–14:00",
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "Toolbar must exist");
			assert.equal(toolbar.getAttribute("role"), "toolbar");
			assert.match(toolbar.className || "", /h-9|min-h-\[36px\]/);

			const room1 = findNodeByTestId(container, "chair-view-room-chair-1");
			assert.ok(room1, "Room badge must exist");
			assert.match(room1.textContent, /Каб\. 1/);

			const doc1 = findNodeByTestId(container, "chair-view-doc-chair-1");
			assert.ok(doc1, "Doctor name badge must exist");
			assert.match(doc1.textContent, /Константинопольский/);
		});
	});
});
