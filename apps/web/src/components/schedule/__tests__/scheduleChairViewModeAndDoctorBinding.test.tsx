/**
 * scheduleChairViewModeAndDoctorBinding.test.tsx
 *
 * DENTE Dental CRM — Wave 42 StomX & IDENT Parity: Chair View Mode & Shift Binding
 * SSOT for Mandates 8b, 8zi, 8e (Doctor Autonomy & Sweet-Spot Decomposition).
 *
 * Scope:
 * 1. ScheduleFilterStrip: Dedicated "По креслам" mode switch (Schedule & Chair Parity).
 * 2. ChairScheduleView: Unified Compact Toolbar (32-36px, Hick's Law & Mandate 8d).
 * 3. ChairScheduleView: 1-Click Doctor Shift Binding Popover & Presets (Mandate 8e, Comprehensive Parity).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import { ScheduleFilterStrip } from "../ScheduleFilterStrip";
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
		fullName: "Петров Петр Сергеевич",
		role: "doctor",
		specialty: "Стоматолог-хирург",
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "1",
		color: "#0d9488",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		room: "2",
		color: "#2563eb",
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
	},
	{
		id: "pat-2",
		fullName: "Кузнецова Мария Ивановна",
		phone: "+7 999 444-55-66",
		status: "active",
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

describe("Wave 42: Chair View Mode & Doctor Shift Binding", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("1. ScheduleFilterStrip: Dedicated 'По креслам' View Mode Switch (Schedule & Chair)", () => {
		it("renders segmented control with 'По креслам' option and fires setScheduleViewMode('chairs')", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let selectedMode = "grid";
			const setScheduleViewMode = (mode: "timeline" | "grid" | "chairs") => {
				selectedMode = mode;
			};

			await act(async () => {
				root.render(
					<ScheduleFilterStrip
						scheduleDateFilter="2026-09-08"
						setScheduleDateFilter={() => {}}
						stepScheduleDay={() => {}}
						activeScheduleFilterCount={0}
						resetScheduleFilters={() => {}}
						scheduleDoctorFilterId={null}
						setScheduleDoctorFilterId={() => {}}
						scheduleChairFilterId={null}
						setScheduleChairFilterId={() => {}}
						scheduleViewMode={selectedMode as any}
						setScheduleViewMode={setScheduleViewMode}
					/>,
				);
			});

			const chairsModeBtn = findNodeByTestId(container, "schedule-view-mode-chairs");
			assert.ok(chairsModeBtn, "Should render button with data-testid='schedule-view-mode-chairs'");
			assert.match(chairsModeBtn.textContent, /кресл/i, "Button should contain 'кресл' text");

			await clickNode(chairsModeBtn);
			assert.equal(selectedMode, "chairs", "Clicking 'По креслам' should change mode to 'chairs'");
		});
	});

	describe("2. ChairScheduleView: Unified Compact Toolbar (Hick's Law & Mandate 8d) & No Doctor Truncation", () => {
		it("renders single unified toolbar with установки count, actions and chair strip", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onOpenRosterModal={() => {}}
						onAddChair={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "Palette strip toolbar must exist");
			assert.equal(toolbar.getAttribute("role"), "toolbar", "Toolbar role must be present");

			const countBadge = findNodeByTestId(container, "chair-view-count-badge");
			assert.ok(countBadge, "Count badge must exist");
			assert.match(countBadge.textContent, /2 кресла/i, "Should show '2 кресла'");

			const rosterBtn = findNodeByTestId(container, "btn-open-chair-roster");
			assert.ok(rosterBtn, "Roster button must be in toolbar");

			const addChairBtn = findNodeByTestId(container, "btn-add-chair-header");
			assert.ok(addChairBtn, "Add chair button must be in toolbar");

			// Check Russian long doctor name is NOT cut with max-w-[100px]
			const chair1Badge = findNodeByTestId(container, "chair-view-badge-chair-1");
			assert.ok(chair1Badge, "Chair 1 badge must exist");
			assert.match(
				chair1Badge.textContent,
				/Константинопольский/,
				"Doctor long surname must be rendered without truncation",
			);
		});
	});

	describe("3. ChairScheduleView: 1-Click Doctor Shift Binding Popover & Presets (Mandate 8e, StomX)", () => {
		it("opens shift popover and assigns morning shift (08:00–14:00) on click", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedChairId: string | null = null;
			let assignedShift: any = null;

			const onAssignChairDoctor = (chairId: string, assignment: ChairDoctorShiftAssignment | null) => {
				assignedChairId = chairId;
				assignedShift = assignment;
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={onAssignChairDoctor}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(triggerBtn, "Doctor assign trigger button must exist");

			await clickNode(triggerBtn);

			const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
			assert.ok(popover, "Shift popover must open on click");

			const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
			assert.ok(morningBtn, "Morning shift preset button must exist");
			await clickNode(morningBtn);

			assert.equal(assignedChairId, "chair-1");
			assert.ok(assignedShift);
			assert.equal(assignedShift.shiftPreset, "morning");
			assert.equal(assignedShift.shiftLabel, "Утро 08-14");
			assert.equal(assignedShift.shiftHours, "08:00–14:00");
			assert.equal(assignedShift.startHour, 8);
			assert.equal(assignedShift.endHour, 14);
		});

		it("assigns '2 через 2' shift preset on click", async () => {
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
						onAssignChairDoctor={(_id, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-2");
			await clickNode(triggerBtn);

			const twoByTwoBtn = findNodeByTestId(container, "chair-view-shift-2x2-chair-2");
			assert.ok(twoByTwoBtn, "2x2 shift preset button must exist");
			await clickNode(twoByTwoBtn);

			assert.ok(assignedShift);
			assert.equal(assignedShift.shiftPreset, "two_shifts");
			assert.equal(assignedShift.shiftLabel, "2 через 2");
			assert.equal(assignedShift.shiftHours, "08:00–20:00");
		});

		it("unassigns doctor when clicking unassign button", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let unassignedCalled = false;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский А.В.",
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
						onAssignChairDoctor={(_id, assignment) => {
							if (assignment === null) {
								unassignedCalled = true;
							}
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			const unassignBtn = findNodeByTestId(container, "chair-view-unassign-chair-1");
			assert.ok(unassignBtn, "Unassign button must exist when doctor is assigned");
			await clickNode(unassignBtn);

			assert.equal(unassignedCalled, true, "Clicking unassign must call onAssignChairDoctor with null");
		});
	});
});
