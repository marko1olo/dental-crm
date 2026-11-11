/**
 * scheduleQuickBookingAutonomyAndDutyDoctor.test.tsx
 *
 * DENTE Dental CRM — Wave 43 StomX & IDENT Parity: QuickBooking Autonomy & Duty Doctor
 * SSOT for Mandates 8b, 8zi, 8e (Doctor Autonomy & Duty Doctor Resolution).
 *
 * Scope:
 * 1. QuickBookingDrawer: Auto-resolves duty doctor and displays soft active visit badge without blocking.
 * 2. AppointmentModal: All selectors remain enabled (disabled=false) when hasOpenVisit is true.
 * 3. resolveChairDutyDoctor: Correctly distinguishes morning vs evening vs out-of-shift hours.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import { resolveChairDutyDoctor, type ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
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

describe("Wave 43: QuickBooking Autonomy & Duty Doctor Resolution (Mandate 8e)", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("QuickBookingDrawer & AppointmentModal: Zero-Blocker Booking (Mandate 8e)", () => {
		it("QuickBookingDrawer: auto-resolves duty doctor and displays soft active visit badge without blocking", async () => {
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
					startHour: 8,
					endHour: 14,
				},
			};

			const mockDashboardWithActiveVisit: Dashboard = {
				...mockDashboard,
				activeVisit: {
					id: "vis-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<QuickBookingDrawer
						isOpen={true}
						onClose={() => {}}
						dashboard={mockDashboardWithActiveVisit}
						chairDoctorAssignments={existingAssignments}
						initialSlot={{
							chairId: "chair-1",
							dateKey: "2026-09-08",
							startTime: "10:00",
							startsAt: "2026-09-08T10:00:00.000Z",
							patientId: "pat-1",
						}}
					/>,
				);
			});

			const bodyRoot = document.body as unknown as MockDomNode;

			// Check doctor select is populated with duty doctor
			const docSelect = findNodeByTestId(bodyRoot, "select-booking-doctor");
			assert.ok(docSelect, "Doctor select must exist in QuickBookingDrawer");
			assert.equal(docSelect.value, "doc-1", "Doctor must be auto-populated with duty doctor doc-1");
			assert.equal(Boolean(docSelect.disabled), false, "Doctor select must NOT be disabled");

			// Check chair select
			const chairSelect = findNodeByTestId(bodyRoot, "select-booking-chair");
			assert.ok(chairSelect, "Chair select must exist");
			assert.equal(chairSelect.value, "chair-1");
			assert.equal(Boolean(chairSelect.disabled), false, "Chair select must NOT be disabled");

			// Check active visit informative badge is rendered
			const activeVisitBadge = findNodeByTestId(bodyRoot, "quick-booking-active-visit-warning");
			assert.ok(activeVisitBadge, "Active visit soft badge must be rendered");
			assert.match(
				activeVisitBadge.textContent,
				/активный приём в кресле/i,
				"Must inform that patient currently has an active chair visit",
			);
		});

		it("AppointmentModal: all selectors remain enabled (disabled=false) when hasOpenVisit is true", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appointmentWithOpenVisit: any = {
				id: "apt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
			};

			const mockDashboardWithActiveVisit: Dashboard = {
				...mockDashboard,
				activeVisit: {
					id: "vis-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						onClose={() => {}}
						appointment={appointmentWithOpenVisit}
						onSave={async () => true}
						dashboard={mockDashboardWithActiveVisit}
						patientName={(_p, id) => id || ""}
						formatTime={(iso) => (iso ? iso.slice(11, 16) : "")}
						toDateTimeLocalValue={(iso) => (iso ? iso.slice(0, 16) : "")}
						fromDateTimeLocalValue={(val) => val}
						appointmentLabels={{
							planned: "Запланирован",
							confirmed: "Подтвержден",
							arrived: "Прибыл",
							in_treatment: "В кресле",
							completed: "Завершен",
							cancelled: "Отменен",
							no_show: "Не явился",
						}}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const bodyRoot = document.body as unknown as MockDomNode;

			const patientSelect = findNodeByTestId(bodyRoot, "select-appointment-patient");
			assert.ok(patientSelect, "Patient select must exist");
			assert.equal(Boolean(patientSelect.disabled), false, "Patient select must NOT be disabled");

			const doctorSelect = findNodeByTestId(bodyRoot, "select-appointment-doctor");
			assert.ok(doctorSelect, "Doctor select must exist");
			assert.equal(Boolean(doctorSelect.disabled), false, "Doctor select must NOT be disabled");

			const chairSelect = findNodeByTestId(bodyRoot, "select-appointment-chair");
			assert.ok(chairSelect, "Chair select must exist");
			assert.equal(Boolean(chairSelect.disabled), false, "Chair select must NOT be disabled");

			const statusSelect = findNodeByTestId(bodyRoot, "select-appointment-status");
			assert.ok(statusSelect, "Status select must exist");
			assert.equal(Boolean(statusSelect.disabled), false, "Status select must NOT be disabled");

			const warningBadge = findNodeByTestId(bodyRoot, "appointment-open-visit-warning");
			assert.ok(warningBadge, "Open visit warning badge must be displayed");
		});

		it("resolveChairDutyDoctor correctly distinguishes morning vs evening vs out-of-shift hours", () => {
			const assignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "two_shifts",
					shiftLabel: "2 смены",
					shiftHours: "08:00–20:00",
					subShifts: [
						{
							doctorId: "doc-1",
							doctorName: "Константинопольский Александр Владимирович",
							startHour: 8,
							endHour: 14,
							shiftHours: "08:00–14:00",
						},
						{
							doctorId: "doc-2",
							doctorName: "Соколова Е.Д.",
							startHour: 14,
							endHour: 20,
							shiftHours: "14:00–20:00",
						},
					],
				},
			};

			const morning = resolveChairDutyDoctor("chair-1", "2026-09-08T10:00:00", assignments);
			assert.equal(morning.doctorId, "doc-1");
			assert.equal(morning.shiftHours, "08:00–14:00");

			const evening = resolveChairDutyDoctor("chair-1", "2026-09-08T16:00:00", assignments);
			assert.equal(evening.doctorId, "doc-2");
			assert.equal(evening.shiftHours, "14:00–20:00");

			const night = resolveChairDutyDoctor("chair-1", "2026-09-08T22:00:00", assignments);
			assert.equal(night.doctorId, null);
		});
	});
});
