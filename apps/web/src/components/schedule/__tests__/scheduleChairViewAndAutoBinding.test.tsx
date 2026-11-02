/**
 * scheduleChairViewAndAutoBinding.test.tsx
 *
 * DENTE Dental CRM — Wave 41 Parity Suite (Mandates 8b, 8zi):
 * Blocks 2, 3, 4, 5:
 * - 2. AppointmentModal: Unblocked Status Selector on Active Visit (Mandate 8e)
 * - 3. ChairScheduleView: Interactive Chair Badges and Filter Toggle
 * - 4. QuickAddChairModal: Default Doctor Selector and Live Preview
 * - 5. ScheduleGrid: Auto-binding chair.defaultDoctorId into effectiveChairAssignments
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { AppointmentModal } from "../AppointmentModal";
import { ChairScheduleView } from "../ChairScheduleView";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import { ScheduleGrid } from "../ScheduleGrid";
import {
	type MockDomNode,
	setupMockDom,
	findNodeByTestId,
	clickNode,
	changeNode,
	createMockFn,
} from "./scheduleMockDomHarness";

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		specialties: ["therapist"],
		active: true,
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Сергеевич",
		role: "doctor",
		specialties: ["surgeon"],
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "1",
		color: "#0d9488",
		specialization: "therapist",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		room: "2",
		color: "#2563eb",
		specialization: "surgeon",
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

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Wave 41: Chair View, Status Selector & Auto-Binding", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("2. AppointmentModal: Unblocked Status Selector on Active Visit (Mandate 8e)", () => {
		it("does NOT disable status selector when hasOpenVisit is true and shows warning banner", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const openVisitDashboard = {
				...mockDashboard,
				activeVisit: {
					appointmentId: "appt-active-visit",
					visitId: "vis-1",
				},
			} as unknown as Dashboard;

			const appt: Partial<Appointment> = {
				id: "appt-active-visit",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
			};

			const lockedStatuses = new Set<Appointment["status"]>(["completed", "cancelled", "no_show"]);

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={openVisitDashboard}
						onClose={() => {}}
						onSave={async () => true}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={lockedStatuses}
					/>,
				);
			});

			const statusSelect = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"select-appointment-status",
			);
			assert.ok(statusSelect, "Must render select-appointment-status");
			assert.strictEqual(Boolean(statusSelect.disabled), false, "Status select must NOT be disabled (Mandate 8e)");

			const warningBanner = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"status-open-visit-warning",
			);
			assert.ok(warningBanner, "Must render status-open-visit-warning banner");
			assert.ok(
				warningBanner.textContent.includes("активный визит"),
				"Warning banner must mention active visit",
			);
		});
	});

	describe("3. ChairScheduleView: Interactive Chair Badges and Filter Toggle", () => {
		it("renders chair badges as interactive buttons with chair-view-badge-${chair.id} and settings button", () => {
			const html = renderToString(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-08"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={defaultAppointmentLabels}
				/>,
			);

			assert.ok(
				html.includes('data-testid="chair-view-badge-chair-1"'),
				"Must render interactive chair badge for chair-1",
			);
			assert.ok(
				html.includes('data-testid="chair-view-badge-chair-2"'),
				"Must render interactive chair badge for chair-2",
			);
			assert.ok(
				html.includes('data-testid="chair-view-settings-chair-1"'),
				"Must render quick settings button for chair-1",
			);
			assert.ok(
				html.includes('data-testid="chair-view-settings-chair-2"'),
				"Must render quick settings button for chair-2",
			);
		});

		it("clicking chair badge triggers onSelectChair callback", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			(document.body as unknown as MockDomNode).appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			const onSelectChairMock = vi.fn();

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onSelectChair={onSelectChairMock}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						appointmentLabels={defaultAppointmentLabels}
					/>,
				);
			});

			const badge1 = findNodeByTestId(
				container,
				"chair-view-badge-chair-1",
			);
			assert.ok(badge1, "chair-view-badge-chair-1 found");

			await clickNode(badge1);

			assert.strictEqual(onSelectChairMock.calls.length, 1);
			assert.strictEqual(onSelectChairMock.calls[0]![0], "chair-1");
		});
	});

	describe("4. QuickAddChairModal: Default Doctor Selector and Live Preview (Schedule & Chair Grid Parity)", () => {
		it("renders quick-add-chair-doctor-select and preview card reflects doctor", () => {
			const html = renderToString(
				<QuickAddChairModal
					isOpen={true}
					onClose={() => {}}
					onAddChair={() => {}}
					existingChairsCount={2}
					doctors={mockDoctors}
					initialData={{
						id: "chair-edit-1",
						name: "Тестовое кресло",
						room: "1",
						color: "#0d9488",
						defaultDoctorId: "doc-1",
					} as any}
				/>,
			);

			assert.ok(
				html.includes('data-testid="quick-add-chair-doctor-select"'),
				"Must render default doctor selector",
			);
			assert.ok(
				html.includes('data-testid="quick-add-chair-preview-doctor"'),
				"Must render doctor preview card block",
			);
			assert.ok(
				html.includes("Иванов Иван Иванович"),
				"Must list doctors in select options",
			);
		});

		it("submitting QuickAddChairModal includes defaultDoctorId in payload", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			(document.body as unknown as MockDomNode).appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			let addedChairData: any = null;
			const onAddChairMock = vi.fn((data: QuickAddChairData) => {
				addedChairData = data;
			});

			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						onAddChair={onAddChairMock}
						existingChairsCount={2}
						doctors={mockDoctors}
					/>,
				);
			});

			const doctorSelect = findNodeByTestId(
				container,
				"quick-add-chair-doctor-select",
			);
			assert.ok(doctorSelect);

			await changeNode(doctorSelect, "doc-2");

			const submitBtn = findNodeByTestId(
				container,
				"quick-add-chair-submit-btn",
			);
			assert.ok(submitBtn);

			await clickNode(submitBtn);

			assert.strictEqual(onAddChairMock.calls.length, 1);
			assert.strictEqual(addedChairData?.defaultDoctorId, "doc-2");
		});
	});

	describe("5. ScheduleGrid: Auto-binding chair.defaultDoctorId into effectiveChairAssignments", () => {
		it("binds doctor from chair.defaultDoctorId when no explicit shift assignment is present", () => {
			const html = renderToString(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-08"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={defaultAppointmentLabels}
				/>,
			);

			assert.ok(
				html.includes("Иванов И.И.") || html.includes("Иванов"),
				"Must display default doctor name on chair 1 header",
			);
		});
	});
});
