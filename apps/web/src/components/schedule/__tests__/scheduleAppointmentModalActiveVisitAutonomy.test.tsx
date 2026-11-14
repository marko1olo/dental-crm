/**
 * scheduleAppointmentModalActiveVisitAutonomy.test.tsx
 *
 * DENTE Dental CRM — Wave 42 StomX & IDENT Parity: AppointmentModal Active Visit Autonomy
 * SSOT for Mandates 8b, 8zi, 8e (Doctor Autonomy & Unblocked Patient Select).
 *
 * Scope:
 * 1. AppointmentModal: Unblocked Patient Select on Active Visit (Mandate 8e Doctor Autonomy).
 *    - Soft informative warning badge instead of blocking modal/disabled state.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	collectAllText,
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

describe("Wave 42: AppointmentModal Active Visit Autonomy (Mandate 8e)", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("AppointmentModal: Unblocked Patient Select on Active Visit (Mandate 8e)", () => {
		it("does NOT disable patient selector when hasOpenVisit is true and shows warning badge", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appointmentWithOpenVisit: any = {
				id: "apt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				cabinet: "1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
				type: "treatment",
				notes: "Лечение кариеса",
				createdAt: "2026-09-08T09:00:00.000Z",
				updatedAt: "2026-09-08T09:00:00.000Z",
			};

			const mockDashboardWithActiveVisit = {
				...mockDashboard,
				activeVisit: {
					id: "visit-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			};

			await act(async () => {
				root.render(
					<QuickBookingDrawer
						isOpen={true}
						onClose={() => {}}
						editingAppointment={appointmentWithOpenVisit}
						dashboard={mockDashboardWithActiveVisit as any}
						toDateTimeLocalValue={(iso) => (iso ? iso.slice(0, 16) : "")}
						fromDateTimeLocalValue={(val) => val}
					/>,
				);
			});

			// Verify patient select is NOT disabled per Mandate 8e
			const targetRoot = document.body as unknown as MockDomNode;
			const patientSelect = findNodeByTestId(targetRoot, "select-appointment-patient");
			assert.ok(patientSelect, "Patient select must exist");
			assert.equal(
				Boolean(patientSelect.disabled),
				false,
				"Patient select must NOT be disabled even when hasOpenVisit is true (Mandate 8e Doctor Autonomy)",
			);

			// Verify informative warning banner is displayed instead of blocking error
			const warningBadge = findNodeByTestId(targetRoot, "appointment-open-visit-warning");
			assert.ok(warningBadge, "Informative warning badge must be displayed");
			assert.match(
				warningBadge.textContent,
				/активный визит.*новую карту/i,
				"Warning should inform that active visit will be moved to new patient card",
			);
		});
	});
});
